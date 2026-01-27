/**
 * Unit tests for OpenAI message transformer
 */

import { OpenAITransformer } from '../../../components/transformers/openai-transformer';
import type { OpenAIMessage } from '../../../main/llm/openai';

describe('OpenAITransformer', () => {
  let transformer: OpenAITransformer;

  beforeEach(() => {
    transformer = new OpenAITransformer();
  });

  describe('User Messages', () => {
    it('should transform a user message', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: 'Hello, how are you?'
      });
    });

    it('should handle user message with null content', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: null,
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: ''
      });
    });
  });

  describe('Assistant Messages', () => {
    it('should transform an assistant message without tool calls', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'assistant',
          content: 'I am doing well, thank you!',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'I am doing well, thank you!'
      });
    });

    it('should handle assistant message with null content and no tool calls', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'assistant',
          content: null,
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: ''
      });
    });
  });

  describe('Tool Calls', () => {
    it('should transform assistant message with tool call and successful result', () => {
      const toolCallId = 'call_123';
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'What is the weather today?',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'San Francisco' })
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: toolCallId,
          content: 'Tool "get_weather" executed successfully:\n{"temperature": 72, "condition": "sunny"}\n(Execution time: 150ms)',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'user',
        content: 'What is the weather today?'
      });
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'get_weather',
          parameters: { location: 'San Francisco' },
          result: { temperature: 72, condition: 'sunny' },
          executionTime: 150,
          status: 'completed'
        }
      });
    });

    it('should transform assistant message with tool call and failed result', () => {
      const toolCallId = 'call_456';
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'Search for something',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: toolCallId,
          content: 'Tool "search" failed: Network timeout',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'search',
          parameters: { query: 'test' },
          result: undefined,
          status: 'failed',
          error: 'Network timeout'
        }
      });
    });

    it('should handle multiple tool calls in one assistant message', () => {
      const toolCallId1 = 'call_1';
      const toolCallId2 = 'call_2';
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'Get weather for two cities',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId1,
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'NYC' })
              }
            },
            {
              id: toolCallId2,
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'LA' })
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: toolCallId1,
          content: 'Tool "get_weather" executed successfully:\n{"temperature": 65}\n(Execution time: 100ms)',
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: toolCallId2,
          content: 'Tool "get_weather" executed successfully:\n{"temperature": 75}\n(Execution time: 120ms)',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        role: 'user',
        content: 'Get weather for two cities'
      });
      expect(result[1].toolCall?.toolName).toBe('get_weather');
      expect(result[1].toolCall?.parameters).toEqual({ location: 'NYC' });
      expect(result[2].toolCall?.toolName).toBe('get_weather');
      expect(result[2].toolCall?.parameters).toEqual({ location: 'LA' });
    });

    it('should handle tool call without result (still executing)', () => {
      const toolCallId = 'call_789';
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'Execute a tool',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: 'long_running_task',
                arguments: JSON.stringify({ duration: 1000 })
              }
            }
          ],
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'long_running_task',
          parameters: { duration: 1000 },
          status: 'executing'
        }
      });
    });
  });

  describe('System Messages', () => {
    it('should filter out system messages', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant',
          timestamp: Date.now()
        },
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      // System messages should be filtered out
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message array', () => {
      const result = transformer.transform([]);
      expect(result).toEqual([]);
    });

    it('should handle malformed tool arguments gracefully', () => {
      const toolCallId = 'call_malformed';
      const messages: OpenAIMessage[] = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: 'test_tool',
                arguments: 'invalid json{'
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: toolCallId,
          content: 'Tool "test_tool" executed successfully:\n{}\n(Execution time: 50ms)',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0].toolCall?.parameters).toEqual({});
    });

    it('should handle tool message without matching tool call', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'tool',
          tool_call_id: 'unknown_id',
          content: 'Tool result',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      // Should skip orphaned tool result
      expect(result).toHaveLength(0);
    });

    it('should handle tool message without tool_call_id', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'tool',
          content: 'Tool result',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      // Should skip malformed tool message
      expect(result).toHaveLength(0);
    });
  });

  describe('Complex Conversations', () => {
    it('should transform a complete conversation with multiple turns', () => {
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'What is the weather in SF?',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'San Francisco' })
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          content: 'Tool "get_weather" executed successfully:\n{"temperature": 72}\n(Execution time: 100ms)',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: 'The weather in San Francisco is 72 degrees.',
          timestamp: Date.now()
        },
        {
          role: 'user',
          content: 'And in NYC?',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_2',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'New York' })
              }
            }
          ],
          timestamp: Date.now()
        },
        {
          role: 'tool',
          tool_call_id: 'call_2',
          content: 'Tool "get_weather" executed successfully:\n{"temperature": 65}\n(Execution time: 90ms)',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: 'The weather in New York is 65 degrees.',
          timestamp: Date.now()
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(6);
      // Verify all messages are present and in order
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant'); // First tool call
      expect(result[2].role).toBe('assistant'); // First response
      expect(result[3].role).toBe('user');
      expect(result[4].role).toBe('assistant'); // Second tool call
      expect(result[5].role).toBe('assistant'); // Second response
    });
  });
});
