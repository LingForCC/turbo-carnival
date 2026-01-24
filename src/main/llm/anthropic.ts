import type { ModelConfig, LLMProvider } from '../../global.d.ts';

interface StreamResult {
  content: string;
  hasToolCalls: boolean;
  toolCalls?: any[];  // Anthropic native tool calls
}

/**
 * Stream Anthropic Claude API with native tool calling
 *
 * Note: This is a simplified implementation that converts to Anthropic format
 * and uses the Messages API. Native tool calling support will be added in a follow-up.
 */
export async function streamAnthropic(
  messages: any[],
  modelConfig: ModelConfig,
  provider: LLMProvider,
  webContents: Electron.WebContents,
  timeout: number = 60000
): Promise<StreamResult> {
  const baseURL = provider.baseURL || 'https://api.anthropic.com';
  const url = `${baseURL}/v1/messages`;

  // Convert OpenAI format to Anthropic format
  const { systemPrompt, anthropicMessages } = convertToAnthropicFormat(messages);

  const requestBody = {
    model: modelConfig.model,
    messages: anthropicMessages,
    system: systemPrompt,
    max_tokens: modelConfig.maxTokens || 4096,
    temperature: modelConfig.temperature,
    top_p: modelConfig.topP,
    stream: true,
    ...(modelConfig.extra || {})
  };

  // Anthropic-specific headers
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': provider.apiKey,
    'anthropic-version': '2023-06-01'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API request failed (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';

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

          // Anthropic streaming format
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            const content = chunk.delta.text;
            fullResponse += content;
            webContents.send('chat-chunk', content);
          }

          // Check for message_stop
          if (chunk.type === 'message_stop') {
            return { content: fullResponse, hasToolCalls: false };
          }
        } catch (parseError) {
          console.warn('Failed to parse Anthropic SSE chunk:', parseError);
        }
      }
    }

    return { content: fullResponse, hasToolCalls: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert OpenAI message format to Anthropic format
 * Anthropic requires system prompt to be separate from messages array
 */
function convertToAnthropicFormat(messages: any[]): {
  systemPrompt: string;
  anthropicMessages: any[];
} {
  let systemPrompt = '';
  const anthropicMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Anthropic expects system prompt as a separate parameter
      // Concatenate if there are multiple system messages
      systemPrompt += msg.content + '\n\n';
    } else {
      anthropicMessages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  return { systemPrompt: systemPrompt.trim(), anthropicMessages };
}
