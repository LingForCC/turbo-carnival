import type { ChatMessage, ToolCallData } from '../components/conversation-panel';
import type { GLMMessage } from '../../llm/main/streaming/glm';

/**
 * Transformer for GLM message format
 * Converts GLM native message format to ChatMessage format for UI display
 */
export class GLMTransformer {
  /**
   * Transform GLM messages to ChatMessage format
   * - Filters out system messages
   * - Converts user/assistant messages
   * - Merges tool calls with their results
   * - Handles content alongside tool_calls in assistant messages
   */
  transform(messages: GLMMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    const pendingToolCalls = new Map<string, ToolCallData>();

    for (const message of messages) {
      // Skip system messages
      if (message.role === 'system') {
        continue;
      }

      // Handle user messages
      if (message.role === 'user') {
        result.push({
          role: 'user',
          content: message.content || ''
        });
        continue;
      }

      // Handle assistant messages without tool calls
      if (message.role === 'assistant' && !message.tool_calls) {
        result.push({
          role: 'assistant',
          content: message.content || '',
          reasoning: message.reasoning_content
        });
        continue;
      }

      // Handle assistant messages with tool calls
      // GLM can have content alongside tool_calls in the same assistant message
      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // If there's content or reasoning, push it as a separate assistant message first
        if (message.content || message.reasoning_content) {
          result.push({
            role: 'assistant',
            content: message.content || '',
            reasoning: message.reasoning_content
          });
        }

        // Add each tool call to the pending map
        for (const toolCall of message.tool_calls) {
          const toolCallData: ToolCallData = {
            toolName: toolCall.function.name,
            parameters: this.parseArguments(toolCall.function.arguments),
            status: 'executing'
          };
          pendingToolCalls.set(toolCall.id, toolCallData);
        }
        continue;
      }

      // Handle tool result messages
      if (message.role === 'tool') {
        const toolCallId = message.tool_call_id;
        if (!toolCallId) {
          console.warn('Tool message missing tool_call_id:', message);
          continue;
        }

        const toolCallData = pendingToolCalls.get(toolCallId);
        if (!toolCallData) {
          console.warn(`No pending tool call found for tool_call_id: ${toolCallId}`);
          continue;
        }

        // Parse the tool result content
        const parsedResult = this.parseToolResult(message.content || '');

        // Update tool call data with result
        toolCallData.result = parsedResult.result;
        toolCallData.executionTime = parsedResult.executionTime;
        toolCallData.status = parsedResult.status;
        toolCallData.error = parsedResult.error;

        // Create assistant message with tool call
        result.push({
          role: 'assistant',
          content: '',
          toolCall: toolCallData
        });

        // Remove from pending map
        pendingToolCalls.delete(toolCallId);
      }
    }

    // Handle any remaining pending tool calls (without results)
    for (const toolCallData of pendingToolCalls.values()) {
      result.push({
        role: 'assistant',
        content: '',
        toolCall: toolCallData
      });
    }

    return result;
  }

  /**
   * Parse JSON stringified arguments
   */
  private parseArguments(argsString: string): Record<string, any> {
    try {
      return JSON.parse(argsString);
    } catch (error) {
      console.error('Failed to parse tool arguments:', error);
      return {};
    }
  }

  /**
   * Parse tool result content to extract result, execution time, and status
   *
   * Success format: "Tool "{name}" executed successfully:\n{result}\n(Execution time: {time}ms)"
   * Failure format: "Tool "{name}" failed: {error}"
   */
  private parseToolResult(content: string): {
    result: any;
    executionTime?: number;
    status: 'completed' | 'failed';
    error?: string;
  } {
    // Try to parse as success format
    const successPattern = /Tool "([^"]+)" executed successfully:\n([\s\S]+)\n\(Execution time: (\d+)ms\)/;
    const successMatch = content.match(successPattern);

    if (successMatch) {
      const resultJson = successMatch[2];
      const executionTime = parseInt(successMatch[3], 10);

      try {
        const result = JSON.parse(resultJson);
        return {
          result,
          executionTime,
          status: 'completed' as const
        };
      } catch {
        // If JSON parsing fails, return the raw content as result
        return {
          result: resultJson,
          executionTime,
          status: 'completed' as const
        };
      }
    }

    // Try to parse as failure format
    const failurePattern = /Tool "([^"]+)" failed: (.+)/;
    const failureMatch = content.match(failurePattern);

    if (failureMatch) {
      return {
        result: undefined,
        status: 'failed' as const,
        error: failureMatch[2]
      };
    }

    // Fallback: return content as-is with completed status
    return {
      result: content,
      status: 'completed' as const
    };
  }
}
