import { ipcMain } from 'electron';
import { getDefaultBaseURL } from './provider-management';
import type { LLMProvider, APIKey, LLMProviderType } from '../global.d.ts';

// ============ PROVIDER CONFIG EXTRACTION ============

/**
 * Provider-specific configuration for API calls
 */
interface ProviderCallConfig {
  apiKey: string;
  baseURL: string;
  headers?: Record<string, string>;
}

/**
 * Extract API configuration from provider
 * Supports both new provider system and legacy APIKey references
 */
export function getProviderConfig(
  providerOrApiKey: LLMProvider | APIKey | string,
  providerType?: LLMProviderType
): ProviderCallConfig {
  let apiKey: string;
  let baseURL: string;

  // NEW: Provider object
  if (typeof providerOrApiKey === 'object' && 'type' in providerOrApiKey) {
    const provider = providerOrApiKey as LLMProvider;
    apiKey = provider.apiKey;
    baseURL = provider.baseURL || getDefaultBaseURL(provider.type) || '';

    // Provider-specific headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    return { apiKey, baseURL, headers };
  }

  // LEGACY: APIKey object (for backward compatibility)
  if (typeof providerOrApiKey === 'object' && 'name' in providerOrApiKey) {
    const apiKeyObj = providerOrApiKey as APIKey;
    apiKey = apiKeyObj.apiKey;
    baseURL = apiKeyObj.baseURL || getDefaultBaseURL(providerType || 'openai') || '';
    return {
      apiKey,
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    };
  }

  // LEGACY: API key string (for backward compatibility)
  apiKey = providerOrApiKey as string;
  baseURL = getDefaultBaseURL(providerType || 'openai') || '';
  return {
    apiKey,
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
  };
}

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
 * Call OpenAI-compatible API with streaming
 * Returns the complete accumulated response content and whether tool calls were detected
 * If tool calls are detected during streaming, stops sending chunks to renderer
 *
 * Now accepts LLMProvider, APIKey, or string (for backward compatibility)
 */
async function streamOpenAICompatibleAPI(
  messages: OpenAIMessage[],
  config: any,
  providerOrKey: LLMProvider | APIKey | string,
  baseURLOverride: string | undefined,
  webContents: Electron.WebContents,
  timeout: number = 60000
): Promise<StreamResult> {
  // Extract configuration from provider or legacy API key
  const providerConfig = getProviderConfig(
    providerOrKey,
    config.providerType // Optional hint for legacy string keys
  );

  const baseURL = baseURLOverride || providerConfig.baseURL;
  const url = `${baseURL}/chat/completions`;

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
      headers: providerConfig.headers || {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
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
    let sendBuffer = ''; // Buffer for chunks to be sent to renderer

    // Helper to check for partial tool call marker
    const hasPartialToolCallMarker = (text: string): boolean => {
      const partialPrefixes = ['{', '{"', '{"t', '{"to', '{"too', '{"tool', '{"tooln', '{"toolna', '{"toolnam', '{"toolname'];
      return partialPrefixes.some(prefix => text.endsWith(prefix));
    };

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

            // If we already detected tool calls, skip all sending logic
            if (detectedToolCalls) {
              continue;
            }

            sendBuffer += content;

            // Check if buffer contains tool call marker
            if (sendBuffer.includes('"toolname"')) {
              // Tool call detected - stop sending chunks
              detectedToolCalls = true;
              sendBuffer = ''; // Clear buffer, don't send
            } else if (hasPartialToolCallMarker(sendBuffer)) {
              // Might be start of tool call marker - wait for more chunks
              continue;
            } else {
              // Safe to send
              if (sendBuffer.length > 0) {
                webContents.send('chat-chunk', sendBuffer);
                sendBuffer = '';
              }
            }
          }

          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            // Send any remaining safe buffer before returning
            if (!detectedToolCalls && sendBuffer.length > 0) {
              webContents.send('chat-chunk', sendBuffer);
            }
            // Don't send chat-complete here - let the caller handle it
            // This allows for post-processing (like tool detection) before completion
            return { content: fullResponse, hasToolCalls: detectedToolCalls };
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE chunk:', parseError);
        }
      }
    }

    // Send any remaining safe buffer on loop completion
    if (!detectedToolCalls && sendBuffer.length > 0) {
      webContents.send('chat-chunk', sendBuffer);
    }

    // Don't send chat-complete here - let the caller handle it
    return { content: fullResponse, hasToolCalls: detectedToolCalls };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ TOOL CALL PARSING ============

/**
 * Parse AI response for tool calls
 * Looks for {"toolname":"tool_name","arguments":{"param":"value"}} format
 */
function parseToolCalls(response: string): any[] {
  const toolCalls: any[] = [];

  // Pattern: {"toolname":"tool_name","arguments":{"param":"value"}}
  const pattern = /{\"toolname\":\"(\w+)\",\"arguments\":({.*?})\}/g;
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

/**
 * Execute a tool with environment-aware routing
 * Routes to worker process for Node.js tools, or renderer for browser tools
 *
 * Note: Parameter validation should be done by the caller before calling this function
 */
async function executeToolWithRouting(
  tool: any,
  parameters: Record<string, any>,
  webContents?: Electron.WebContents
): Promise<any> {
  const environment = tool.environment || 'node';

  if (environment === 'browser' && webContents) {
    // Browser tools: Forward to renderer process
    return new Promise((resolve, reject) => {
      const timeout = tool.timeout || 30000;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Browser tool execution timed out after ${timeout}ms`));
      }, timeout);

      const responseHandler = (_event: any, result: any) => {
        cleanup();
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Browser tool execution failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        ipcMain.removeListener('tools:browserResult', responseHandler);
      };

      ipcMain.on('tools:browserResult', responseHandler);
      webContents.send('tools:executeBrowser', {
        code: tool.code,
        parameters,
        timeout
      });
    });
  } else {
    // Node.js tools: Execute in worker process
    const { executeToolInWorker } = await import('./tool-worker-executor');
    return executeToolInWorker(tool, parameters);
  }
}

// ============ EXPORTS ============

/**
 * Register all OpenAI client-related IPC handlers
 * NOTE: This is now a no-op - handlers are registered in agent management modules
 */
export function registerOpenAIClientIPCHandlers(): void {
  // No-op - chat:sendMessage and chat:streamMessage handlers
  // are now registered in chat-agent-management and app-agent-management modules
  console.log('OpenAI client IPC handlers are now registered in agent management modules');
}

// Export utility functions for use by agent management modules
export {
  streamOpenAICompatibleAPI,
  parseToolCalls,
  executeToolWithRouting
};
