import { getDefaultBaseURL } from '../provider-management';
import type { ModelConfig, LLMProvider } from '../../global.d.ts';

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
  [key: string]: any; // Allow extra properties for model-specific settings
}

interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

/**
 * Stream OpenAI-compatible API (OpenAI, Azure, custom providers)
 * Extracted from openai-client.ts streamOpenAICompatibleAPI
 */
export async function streamOpenAI(
  messages: any[],
  modelConfig: ModelConfig,
  provider: LLMProvider,
  webContents: Electron.WebContents,
  timeout: number = 60000
): Promise<StreamResult> {
  const baseURL = provider.baseURL || getDefaultBaseURL(provider.type) || '';
  const url = `${baseURL}/chat/completions`;

  const requestBody: OpenAIRequest = {
    messages,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.maxTokens,
    top_p: modelConfig.topP,
    stream: true,
    // Spread extra properties for model-specific settings
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
