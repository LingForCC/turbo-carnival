import * as fs from 'fs';
import * as path from 'path';
import { getDefaultBaseURL } from '../provider-management';
import type { ModelConfig, LLMProvider } from '../../types/provider-management';
import type { Tool } from '../../types/tool-management';
import type { Agent } from '../../types/agent-management';
import { getToolByName, validateJSONSchema } from '../tool-management';
import { executeToolWithRouting } from './index';
import type { StreamLLMOptions, StreamResult } from './index';

// ============ TYPE DEFINITIONS ============

/**
 * GLM native tool call format
 * GLM uses OpenAI-compatible tool calling format
 */
export interface GLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON stringified arguments
  };
}

/**
 * Internal tool call format for processing (during streaming)
 */
interface InternalGLMToolCall {
  toolName: string;
  parameters: Record<string, any>;
  toolCallId?: string;
  _argumentsBuffer?: string;  // Temporary buffer for streaming arguments
}

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: GLMToolCall[];
  reasoning_content?: string;  // GLM thinking/reasoning content
  timestamp?: number;
}

interface GLMRequest {
  messages: GLMMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: 'auto' | 'none';
  thinking?: {
    type: 'enabled' | 'disabled';
    clear_thinking: boolean;
  };
  [key: string]: any;
}

// ============ MESSAGE BUILDING HELPERS ============

/**
 * Build file content messages from file paths
 * Reads file contents and formats them as system messages
 */
function buildFileContentMessages(filePaths: string[]): GLMMessage[] {
  const messages: GLMMessage[] = [];

  if (!filePaths || filePaths.length === 0) {
    return messages;
  }

  for (const filePath of filePaths) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      messages.push({
        role: 'system',
        content: `[File: ${fileName}]\n${fileContent}`
      });
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
    }
  }

  return messages;
}

/**
 * Build complete messages array from system prompt, files, agent history, and optional current user message
 * Note: If userMessage is already in agent.history, pass undefined to avoid duplication
 */
function buildAllMessages(options: {
  systemPrompt: string;
  filePaths?: string[];
  agent: Agent;
  userMessage?: string;
}): GLMMessage[] {
  const { systemPrompt, filePaths, agent, userMessage } = options;
  const messages: GLMMessage[] = [];

  // Add system prompt
  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // Add file content messages
  const fileMessages = buildFileContentMessages(filePaths || []);
  messages.push(...fileMessages);

  // Add conversation history from agent
  for (const msg of agent.history || []) {
    const mapped: GLMMessage = {
      role: msg.role,
      content: msg.content
    };
    if (msg.tool_call_id) {
      mapped.tool_call_id = msg.tool_call_id;
    }
    if (msg.tool_calls) {
      mapped.tool_calls = msg.tool_calls;
    }
    messages.push(mapped);
  }

  // Add current user message if provided
  if (userMessage !== undefined && userMessage !== '') {
    messages.push({
      role: 'user',
      content: userMessage
    });
  }

  return messages;
}

// ============ MAIN STREAMING FUNCTION ============

/**
 * Stream GLM (Zhipu AI) API with native tool calling
 * GLM uses OpenAI-compatible tool calling format
 */
export async function streamGLM(options: StreamLLMOptions): Promise<StreamResult> {
  const {
    systemPrompt,
    filePaths,
    userMessage,
    provider,
    modelConfig,
    tools,
    webContents,
    enableTools = true,
    timeout = 60000,
    agent,
    maxIterations = 10,
    toolCallChannel = 'chat-agent:toolCall'
  } = options;

  // Save user message to agent history
  agent.history = agent.history || [];
  agent.history.push({ role: 'user', content: userMessage, timestamp: Date.now() });

  // Build initial messages (user message is already in agent.history)
  let apiMessages = buildAllMessages({
    systemPrompt,
    filePaths,
    agent,
    userMessage: undefined  // User message already pushed to history
  });

  // If tools disabled, single pass streaming
  if (!enableTools) {
    const { content: response, reasoningContent } = await streamGLMSingle(apiMessages, modelConfig, provider, webContents, timeout, undefined);
    // Save assistant response to agent history (including reasoning if present)
    agent.history.push({
      role: 'assistant',
      content: response,
      reasoning_content: reasoningContent,
      timestamp: Date.now()
    });

    webContents.send('chat-complete');
    return { content: response, hasToolCalls: false };
  }

  // Tool call iteration loop
  let iterationCount = 0;

  while (iterationCount < maxIterations) {
    iterationCount++;

    const { content: response, hasToolCalls, toolCalls, reasoningContent } = await streamGLMSingle(
      apiMessages,
      modelConfig,
      provider,
      webContents,
      timeout,
      tools
    );

    // If no tool calls, return response
    if (!hasToolCalls || !toolCalls || toolCalls.length === 0) {
      // Save assistant response to agent history (including reasoning if present)
      agent.history.push({
        role: 'assistant',
        content: response,
        reasoning_content: reasoningContent,
        timestamp: Date.now()
      });
      
      webContents.send('chat-complete');
      return { content: response, hasToolCalls: false };
    }

    // Create assistant message with tool_calls (GLM native format)
    const glmToolCalls: GLMToolCall[] = toolCalls.map(tc => ({
      id: tc.toolCallId || '',
      type: 'function' as const,
      function: {
        name: tc.toolName,
        arguments: JSON.stringify(tc.parameters)
      }
    }));
    const assistantMessage = {
      role: 'assistant' as const,
      content: response,  // Include the actual streamed content
      tool_calls: glmToolCalls,
      reasoning_content: reasoningContent  // Include reasoning for conversation continuity
    };

    // Add assistant message to apiMessages for next API request
    apiMessages.push(assistantMessage);

    // Save assistant message to agent history for persistent storage
    agent.history.push({
      ...assistantMessage,
      timestamp: Date.now()
    });

    // Execute tools and add results to messages
    const toolResults = await executeToolCalls(toolCalls, agent, webContents, toolCallChannel);

    // Add tool results to messages for next iteration (GLM native format)
    for (const result of toolResults) {
      apiMessages.push({
        role: 'tool',
        tool_call_id: result.toolCallId!,
        content: result.content
      });
    }
  }

  // Max iterations reached - return last response with warning
  const { content: lastResponse, reasoningContent: lastReasoning } = await streamGLMSingle(apiMessages, modelConfig, provider, webContents, timeout, undefined);

  const finalResponse = lastResponse + '\n\n[Note: Maximum tool call rounds reached. Some tool calls may not have been executed.]';
  // Save assistant response to agent history (including reasoning if present)
  agent.history.push({
    role: 'assistant',
    content: finalResponse,
    reasoning_content: lastReasoning,
    timestamp: Date.now()
  });
  webContents.send('chat-complete');

  return {
    content: finalResponse,
    hasToolCalls: false
  };
}

// ============ SINGLE STREAMING REQUEST ============

/**
 * Convert Tool to GLM's native tool format (same as OpenAI)
 */
function convertToolToGLMFormat(tool: Tool): any {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}

/**
 * Single GLM streaming request with native tool calling
 * GLM uses OpenAI-compatible format for tools
 */
async function streamGLMSingle(
  messages: GLMMessage[],
  modelConfig: ModelConfig,
  provider: LLMProvider,
  webContents: Electron.WebContents,
  timeout: number = 60000,
  tools?: Tool[]
): Promise<{ content: string; hasToolCalls: boolean; toolCalls?: InternalGLMToolCall[]; reasoningContent?: string }> {
  const baseURL = provider.baseURL || getDefaultBaseURL(provider.type) || '';
  const url = `${baseURL}/chat/completions`;

  // Convert tools to GLM format if provided (same as OpenAI)
  const glmTools = tools && tools.length > 0
    ? tools.filter(t => t.enabled).map(convertToolToGLMFormat)
    : undefined;

  const requestBody: GLMRequest = {
    messages,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.maxTokens,
    top_p: modelConfig.topP,
    stream: true,
    // Enable GLM thinking/reasoning feature
    thinking: {
      type: 'enabled',
      clear_thinking: false  // Preserve thinking for conversation context
    },
    ...(glmTools && glmTools.length > 0 ? {
      tools: glmTools,
      tool_choice: 'auto'
    } : {}),
    ...(modelConfig.extra || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GLM API request failed (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';
    let fullReasoning = '';  // Track reasoning content
    let toolCalls: InternalGLMToolCall[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonStr = trimmedLine.slice(6);
          const chunk = JSON.parse(jsonStr);

          const delta = chunk.choices?.[0]?.delta;

          // Handle GLM thinking/reasoning content
          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            // Emit reasoning content to UI for display
            webContents.send('chat-reasoning', delta.reasoning_content);
          }

          // Handle GLM native tool calling (same format as OpenAI)
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.index !== undefined) {
                while (toolCalls.length <= toolCall.index) {
                  toolCalls.push({ toolName: '', parameters: {} });
                }

                const targetCall = toolCalls[toolCall.index];

                if (toolCall.id) {
                  targetCall.toolCallId = toolCall.id;
                }

                if (toolCall.function?.name) {
                  targetCall.toolName = toolCall.function.name;
                }

                if (toolCall.function?.arguments) {
                  if (!targetCall._argumentsBuffer) {
                    targetCall._argumentsBuffer = '';
                  }
                  targetCall._argumentsBuffer += toolCall.function.arguments;
                  try {
                    targetCall.parameters = JSON.parse(targetCall._argumentsBuffer);
                    delete targetCall._argumentsBuffer;
                  } catch (e) {
                    // Not complete yet, keep buffering
                  }
                }
              }
            }
          }

          // Handle content chunks - content can exist independently alongside tool_calls
          const content = delta?.content;
          if (content) {
            fullResponse += content;
            webContents.send('chat-chunk', content);
          }

          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            // Parse any remaining buffered arguments
            for (const toolCall of toolCalls) {
              if (toolCall._argumentsBuffer) {
                try {
                  toolCall.parameters = JSON.parse(toolCall._argumentsBuffer);
                  delete toolCall._argumentsBuffer;
                } catch (e) {
                  console.warn('Failed to parse tool call arguments:', toolCall._argumentsBuffer);
                }
              }
            }

            const hasToolCalls = toolCalls.some(tc => tc.toolName);

            // Return with appropriate hasToolCalls flag
            // If finish_reason is 'tool_calls', we need to execute tools and make another call
            // Otherwise this is the final response
            return {
              content: fullResponse,
              hasToolCalls,
              toolCalls: hasToolCalls ? toolCalls : undefined,
              reasoningContent: fullReasoning || undefined
            };
          }
        } catch (parseError) {
          console.warn('Failed to parse GLM SSE chunk:', parseError);
        }
      }
    }

    return {
      content: fullResponse,
      hasToolCalls: false,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      reasoningContent: fullReasoning || undefined
    };
  } catch (error: any) {
    webContents.send('chat-error', { error: error.message || String(error) });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ TOOL EXECUTION ============

async function executeToolCalls(
  toolCalls: InternalGLMToolCall[],
  agent: Agent,
  webContents: Electron.WebContents,
  toolCallChannel: string
): Promise<Array<{ toolCallId: string; content: string }>> {
  const toolResults: Array<{ toolCallId: string; content: string }> = [];

  // Send started events to UI
  for (const toolCall of toolCalls) {
    webContents.send(toolCallChannel, {
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'started'
    });
  }

  // Execute tools
  for (const toolCall of toolCalls) {
    const startTime = Date.now();
    try {
      const tool = getToolByName(toolCall.toolName);
      if (!tool) {
        const executionTime = Date.now() - startTime;
        const errorMsg = `Tool "${toolCall.toolName}" not found`;
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${errorMsg}` });
        handleToolError(webContents, agent, toolCall, errorMsg, toolCallChannel, executionTime);
        continue;
      }

      if (!tool.enabled) {
        const executionTime = Date.now() - startTime;
        const errorMsg = `Tool "${toolCall.toolName}" is disabled`;
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${errorMsg}` });
        handleToolError(webContents, agent, toolCall, errorMsg, toolCallChannel, executionTime);
        continue;
      }

      const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
      if (validationError) {
        const executionTime = Date.now() - startTime;
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${validationError}` });
        handleToolError(webContents, agent, toolCall, validationError, toolCallChannel, executionTime);
        continue;
      }

      const result = await executeToolWithRouting(tool, toolCall.parameters, webContents);
      toolResults.push({
        toolCallId: toolCall.toolCallId!,
        content: `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
      });

      handleToolSuccess(webContents, agent, toolCall, result, toolCallChannel);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error.message;
      toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Tool "${toolCall.toolName}" failed: ${errorMsg}` });
      handleToolError(webContents, agent, toolCall, errorMsg, toolCallChannel, executionTime);
    }
  }

  return toolResults;
}

function handleToolSuccess(
  webContents: Electron.WebContents,
  agent: Agent,
  toolCall: InternalGLMToolCall,
  result: any,
  toolCallChannel: string
): void {
  webContents.send(toolCallChannel, {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'completed',
    result: result.result,
    executionTime: result.executionTime
  });

  // Push tool result in OpenAI native format
  agent.history.push({
    role: 'tool',
    tool_call_id: toolCall.toolCallId!,
    content: `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`,
    timestamp: Date.now()
  });
}

function handleToolError(
  webContents: Electron.WebContents,
  agent: Agent,
  toolCall: InternalGLMToolCall,
  errorMsg: string,
  toolCallChannel: string,
  executionTime: number
): void {
  webContents.send(toolCallChannel, {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'failed',
    error: errorMsg,
    executionTime
  });

  // Push tool result in OpenAI native format
  agent.history.push({
    role: 'tool',
    tool_call_id: toolCall.toolCallId!,
    content: `Tool "${toolCall.toolName}" failed: ${errorMsg}`,
    timestamp: Date.now()
  });
}
