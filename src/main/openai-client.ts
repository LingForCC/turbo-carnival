import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getAPIKeyByName } from './apiKey-management';
import { loadTools, getToolByName, validateJSONSchema } from './tool-management';
import { executeToolInWorker } from './tool-worker-executor';

// ============ OPENAI API TYPES ============

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  messages: OpenAIMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

// ============ OPENAI API CLIENT ============

/**
 * Call OpenAI-compatible API (non-streaming)
 */
async function callOpenAICompatibleAPI(
  messages: OpenAIMessage[],
  config: any,
  apiKey: string,
  baseURL?: string
): Promise<any> {
  const endpoint = baseURL || 'https://api.openai.com/v1';
  const url = `${endpoint}/chat/completions`;

  const requestBody: OpenAIRequest = {
    messages,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Call OpenAI-compatible API with streaming
 * Returns the complete accumulated response content and whether tool calls were detected
 * If tool calls are detected during streaming, stops sending chunks to renderer
 */
async function streamOpenAICompatibleAPI(
  messages: OpenAIMessage[],
  config: any,
  apiKey: string,
  baseURL: string | undefined,
  webContents: Electron.WebContents,
  timeout: number = 60000
): Promise<StreamResult> {
  const endpoint = baseURL || 'https://api.openai.com/v1';
  const url = `${endpoint}/chat/completions`;

  const requestBody: OpenAIRequest = {
    messages,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
    let detectedToolCalls = false;

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

          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;

            // Check if response contains tool call marker
            // Tool call format: <tool_call>tool_name|{"param":"value"}</tool_call>
            if (fullResponse.includes('<tool_call>')) {
              // Tool call detected - stop sending chunks to renderer
              detectedToolCalls = true;
            } else if (!detectedToolCalls) {
              // Only send chunks if we haven't detected tool calls yet
              webContents.send('chat-chunk', content);
            }
          }

          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            // Don't send chat-complete here - let the caller handle it
            // This allows for post-processing (like tool detection) before completion
            return { content: fullResponse, hasToolCalls: detectedToolCalls };
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE chunk:', parseError);
        }
      }
    }

    // Don't send chat-complete here - let the caller handle it
    return { content: fullResponse, hasToolCalls: detectedToolCalls };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ TOOL CALL PARSING ============

/**
 * Format tool descriptions for inclusion in system prompt
 * This helps AI agents understand what tools are available and how to use them
 */
function formatToolDescriptions(tools: any[]): string {
  if (tools.length === 0) {
    return '';
  }

  const enabledTools = tools.filter(t => t.enabled);

  if (enabledTools.length === 0) {
    return '';
  }

  let descriptions = '\n\nAvailable Tools:\n';
  descriptions += 'You can call tools using this format: <tool_call>tool_name|{"param":"value"}</tool_call>\n\n';

  for (const tool of enabledTools) {
    descriptions += `- ${tool.name}: ${tool.description}\n`;
    descriptions += `  Input: ${JSON.stringify(tool.parameters)}\n`;
    if (tool.returns) {
      descriptions += `  Output: ${JSON.stringify(tool.returns)}\n`;
    }
    descriptions += '\n';
  }

  return descriptions;
}

/**
 * Parse AI response for tool calls
 * Looks for <tool_call>tool_name|{"param":"value"}</tool_call> format
 */
function parseToolCalls(response: string): any[] {
  const toolCalls: any[] = [];

  // Pattern: <tool_call>tool_name|{"param":"value"}</tool_call>
  const pattern = /<tool_call>(\w+)\|({.*?})<\/tool_call>/g;
  let match;

  while ((match = pattern.exec(response)) !== null) {
    try {
      toolCalls.push({
        toolName: match[1],
        parameters: JSON.parse(match[2])
      });
    } catch (error) {
      console.warn('Failed to parse tool call:', match[0]);
    }
  }

  return toolCalls;
}

// ============ CHAT IPC HANDLERS ============

/**
 * Register all OpenAI client-related IPC handlers
 */
export function registerOpenAIClientIPCHandlers(): void {
  // Handler: Send chat message (non-streaming)
  ipcMain.handle('chat:sendMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // Load agent
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    // Get API key
    const apiKeyName = agent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      throw new Error('Agent does not have an API key configured');
    }

    const apiKeyEntry = getAPIKeyByName(apiKeyName);
    if (!apiKeyEntry) {
      throw new Error(`API key "${apiKeyName}" not found`);
    }

    // Build messages array
    const messages: OpenAIMessage[] = [];

    // Load tools and build enhanced system prompt
    const tools = loadTools();
    const toolDescriptions = formatToolDescriptions(tools);

    let systemPrompt = agent.prompts?.system || '';
    if (toolDescriptions) {
      systemPrompt += toolDescriptions;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add file contents if provided
    if (filePaths && filePaths.length > 0) {
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
    }

    // Add conversation history
    if (agent.history && agent.history.length > 0) {
      messages.push(...agent.history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })));
    }

    // Add new user message
    messages.push({ role: 'user', content: message });

    // Call API
    const response = await callOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL
    );

    // Extract assistant response
    const assistantMessage = response.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('No response content from API');
    }

    // Check for tool calls
    const toolCalls = parseToolCalls(assistantMessage);

    if (toolCalls.length > 0) {
      // Tool calls detected - execute them
      console.log('Tool calls detected:', toolCalls);

      // Save initial exchange (user message + AI response with tool calls)
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: assistantMessage, timestamp: Date.now() }
      );

      // Execute each tool and collect results
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          const tool = getToolByName(toolCall.toolName);
          if (!tool) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" not found`);
            continue;
          }

          if (!tool.enabled) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" is disabled`);
            continue;
          }

          // Validate parameters
          const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
          if (validationError) {
            toolResults.push(`Error: ${validationError}`);
            continue;
          }

          // Execute tool
          const result = await executeToolInWorker(tool, toolCall.parameters);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results as system messages
      for (const result of toolResults) {
        messages.push({ role: 'system', content: result });
      }

      // Get final AI response after tool execution
      const finalResponse = await callOpenAICompatibleAPI(
        messages,
        agent.config,
        apiKeyEntry.apiKey,
        agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL
      );

      const finalMessage = finalResponse.choices?.[0]?.message?.content;
      if (!finalMessage) {
        throw new Error('No response content from API after tool execution');
      }

      // Save final AI response to history
      agent.history.push({ role: 'assistant', content: finalMessage, timestamp: Date.now() });
      saveAgent(projectPath, agent);

      return finalMessage;
    }

    // No tool calls - proceed normally
    // Update agent history
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: assistantMessage, timestamp }
    );

    // Save updated agent
    saveAgent(projectPath, agent);

    return response;
  });

  // Handler: Stream chat message
  ipcMain.handle('chat:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // Validate inputs first
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    const apiKeyName = agent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      throw new Error('Agent does not have an API key configured');
    }

    const apiKeyEntry = getAPIKeyByName(apiKeyName);
    if (!apiKeyEntry) {
      throw new Error(`API key "${apiKeyName}" not found`);
    }

    // Build messages array
    const messages: OpenAIMessage[] = [];

    // Load tools and build enhanced system prompt
    const tools = loadTools();
    const toolDescriptions = formatToolDescriptions(tools);

    let systemPrompt = agent.prompts?.system || '';
    if (toolDescriptions) {
      systemPrompt += toolDescriptions;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add file contents if provided
    if (filePaths && filePaths.length > 0) {
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
    }

    if (agent.history && agent.history.length > 0) {
      messages.push(...agent.history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: message });

    // Start streaming and get the full response with tool call detection
    const { content: fullResponse, hasToolCalls } = await streamOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
      event.sender
    );

    // After streaming completes, check for tool calls
    const toolCalls = parseToolCalls(fullResponse);

    if (toolCalls.length > 0) {
      // Tool calls detected - execute them and make a second API call
      console.log('Tool calls detected in stream:', toolCalls);

      // Save initial exchange
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: fullResponse, timestamp: Date.now() }
      );

      // Execute each tool and collect results
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          const tool = getToolByName(toolCall.toolName);
          if (!tool || !tool.enabled) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" ${!tool ? 'not found' : 'is disabled'}`);
            continue;
          }

          // Validate parameters
          const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
          if (validationError) {
            toolResults.push(`Error: ${validationError}`);
            continue;
          }

          // Execute tool
          const result = await executeToolInWorker(tool, toolCall.parameters);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results as system messages
      for (const result of toolResults) {
        messages.push({ role: 'system', content: result });
      }

      // Stream the final response (second API call with tool results)
      const { content: finalMessage } = await streamOpenAICompatibleAPI(
        messages,
        agent.config,
        apiKeyEntry.apiKey,
        agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
        event.sender
      );

      // Save final AI response to history
      agent.history.push({ role: 'assistant', content: finalMessage, timestamp: Date.now() });
      saveAgent(projectPath, agent);

      // Send completion event to renderer
      event.sender.send('chat-complete');

      return finalMessage;
    }

    // No tool calls - proceed normally
    // Update agent history with the conversation
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: fullResponse, timestamp }
    );

    // Save updated agent
    saveAgent(projectPath, agent);

    // Send completion event to renderer
    event.sender.send('chat-complete');

    return fullResponse;
  });
}
