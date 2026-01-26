import { getDefaultBaseURL } from '../provider-management';
import type { ModelConfig, LLMProvider, Tool, Agent } from '../../global.d.ts';
import { getToolByName, validateJSONSchema } from '../tool-management';
import { executeToolWithRouting } from '../openai-client';
import { buildAllMessages, type StreamLLMOptions, type StreamResult, type ToolCall } from './index';

// ============ TYPE DEFINITIONS ============

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface OpenAIRequest {
  messages: OpenAIMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: 'auto' | 'none' | 'required';
  [key: string]: any;
}

// ============ MAIN STREAMING FUNCTION ============

/**
 * Stream OpenAI-compatible API with tool call iteration
 * Handles complete tool calling flow internally
 */
export async function streamOpenAI(options: StreamLLMOptions): Promise<StreamResult> {
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
    maxIterations = 10
  } = options;

  // Save user message to agent history
  agent.history = agent.history || [];
  agent.history.push({ role: 'user', content: userMessage, timestamp: Date.now() });

  // Build initial messages
  let apiMessages = buildAllMessages({
    systemPrompt,
    filePaths,
    agent,
    userMessage
  });

  // If tools disabled, single pass streaming
  if (!enableTools) {
    const { content: response } = await streamOpenAISingle(apiMessages, modelConfig, provider, webContents, timeout, undefined);
    // Save assistant response to agent history
    agent.history.push({ role: 'assistant', content: response, timestamp: Date.now() });
    return { content: response, hasToolCalls: false };
  }

  // Tool call iteration loop
  let iterationCount = 0;

  while (iterationCount < maxIterations) {
    iterationCount++;

    const { content: response, hasToolCalls, toolCalls } = await streamOpenAISingle(
      apiMessages,
      modelConfig,
      provider,
      webContents,
      timeout,
      tools
    );

    // If no tool calls, return response
    if (!hasToolCalls || !toolCalls || toolCalls.length === 0) {
      // Save assistant response to agent history
      agent.history.push({ role: 'assistant', content: response, timestamp: Date.now() });
      return { content: response, hasToolCalls: false };
    }

    // Deduplicate tool calls
    let uniqueToolCalls = toolCalls;
    if (toolCalls.length > 0) {
      const seen = new Set<string>();
      uniqueToolCalls = toolCalls.filter(call => {
        const key = `${call.toolName}|${JSON.stringify(call.parameters)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueToolCalls.length !== toolCalls.length) {
        console.warn(`Detected ${toolCalls.length - uniqueToolCalls.length} duplicate tool calls, removing them`);
      }
    }

    // Execute tools and add results to messages
    console.log(`Tool call iteration ${iterationCount}: ${uniqueToolCalls.length} tools detected`);
    const toolResults = await executeToolCalls(uniqueToolCalls, agent, webContents);

    // Add tool results to messages for next iteration (OpenAI native format)
    for (const result of toolResults) {
      apiMessages.push({
        role: 'tool',
        tool_call_id: result.toolCallId!,
        content: result.content
      });
    }
  }

  // Max iterations reached - return last response with warning
  const { content: lastResponse } = await streamOpenAISingle(apiMessages, modelConfig, provider, webContents, timeout, undefined);

  const finalResponse = lastResponse + '\n\n[Note: Maximum tool call rounds reached. Some tool calls may not have been executed.]';
  // Save assistant response to agent history
  agent.history.push({ role: 'assistant', content: finalResponse, timestamp: Date.now() });

  return {
    content: finalResponse,
    hasToolCalls: false
  };
}

// ============ SINGLE STREAMING REQUEST ============

/**
 * Convert Tool to OpenAI's native tool format
 */
function convertToolToOpenAIFormat(tool: Tool): any {
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
 * Single OpenAI streaming request with native tool calling
 * Returns tool calls in native format without executing them
 */
async function streamOpenAISingle(
  messages: any[],
  modelConfig: ModelConfig,
  provider: LLMProvider,
  webContents: Electron.WebContents,
  timeout: number = 60000,
  tools?: Tool[]
): Promise<{ content: string; hasToolCalls: boolean; toolCalls?: ToolCall[] }> {
  const baseURL = provider.baseURL || getDefaultBaseURL(provider.type) || '';
  const url = `${baseURL}/chat/completions`;

  // Convert tools to OpenAI format if provided
  const openaiTools = tools && tools.length > 0
    ? tools.filter(t => t.enabled).map(convertToolToOpenAIFormat)
    : undefined;

  const requestBody: OpenAIRequest = {
    messages,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.maxTokens,
    top_p: modelConfig.topP,
    stream: true,
    ...(openaiTools && openaiTools.length > 0 ? {
      tools: openaiTools,
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
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';
    let toolCalls: ToolCall[] = [];

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

          // Extract content
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            webContents.send('chat-chunk', content);
          }

          // Handle OpenAI native tool calling
          const delta = chunk.choices?.[0]?.delta;

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
            return { content: fullResponse, hasToolCalls, toolCalls: hasToolCalls ? toolCalls : undefined };
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE chunk:', parseError);
        }
      }
    }

    return { content: fullResponse, hasToolCalls: false, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ TOOL EXECUTION ============

async function executeToolCalls(
  toolCalls: ToolCall[],
  agent: Agent,
  webContents: Electron.WebContents
): Promise<Array<{ toolCallId: string; content: string }>> {
  const toolResults: Array<{ toolCallId: string; content: string }> = [];

  // Send started events and add to history
  for (const toolCall of toolCalls) {
    webContents.send('chat-agent:toolCall', {
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'started'
    });

    agent.history.push({
      role: 'assistant',
      content: `Calling tool: ${toolCall.toolName}`,
      timestamp: Date.now(),
      toolCall: {
        type: 'start',
        toolName: toolCall.toolName,
        parameters: toolCall.parameters,
        status: 'executing'
      }
    });
  }

  // Execute tools
  for (const toolCall of toolCalls) {
    try {
      const tool = getToolByName(toolCall.toolName);
      if (!tool) {
        const errorMsg = `Tool "${toolCall.toolName}" not found`;
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${errorMsg}` });
        handleToolError(webContents, agent, toolCall, errorMsg);
        continue;
      }

      if (!tool.enabled) {
        const errorMsg = `Tool "${toolCall.toolName}" is disabled`;
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${errorMsg}` });
        handleToolError(webContents, agent, toolCall, errorMsg);
        continue;
      }

      const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
      if (validationError) {
        toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Error: ${validationError}` });
        handleToolError(webContents, agent, toolCall, validationError);
        continue;
      }

      const result = await executeToolWithRouting(tool, toolCall.parameters, webContents);
      toolResults.push({
        toolCallId: toolCall.toolCallId!,
        content: `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
      });

      handleToolSuccess(webContents, agent, toolCall, result);
    } catch (error: any) {
      const errorMsg = error.message;
      toolResults.push({ toolCallId: toolCall.toolCallId!, content: `Tool "${toolCall.toolName}" failed: ${errorMsg}` });
      handleToolError(webContents, agent, toolCall, errorMsg);
    }
  }

  return toolResults;
}

function handleToolSuccess(
  webContents: Electron.WebContents,
  agent: Agent,
  toolCall: ToolCall,
  result: any
): void {
  webContents.send('chat-agent:toolCall', {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'completed',
    result: result.result,
    executionTime: result.executionTime
  });

  agent.history.push({
    role: 'user',
    content: `Tool "${toolCall.toolName}" executed successfully`,
    timestamp: Date.now(),
    toolCall: {
      type: 'result',
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      result: result.result,
      executionTime: result.executionTime,
      status: 'completed'
    }
  });
}

function handleToolError(
  webContents: Electron.WebContents,
  agent: Agent,
  toolCall: ToolCall,
  errorMsg: string
): void {
  webContents.send('chat-agent:toolCall', {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'failed',
    error: errorMsg
  });

  agent.history.push({
    role: 'user',
    content: `Tool "${toolCall.toolName}" failed`,
    timestamp: Date.now(),
    toolCall: {
      type: 'result',
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'failed',
      error: errorMsg
    }
  });
}
