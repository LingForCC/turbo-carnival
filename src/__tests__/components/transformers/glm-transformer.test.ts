import { GLMTransformer } from '../../../conversation/transformers/glm-transformer';
import type { GLMMessage } from '../../../llm/main/streaming/glm';

describe('GLMTransformer', () => {
  let transformer: GLMTransformer;

  beforeEach(() => {
    transformer = new GLMTransformer();
  });

  describe('User Messages', () => {
    it('should transform a user message', () => {
      const messages: GLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([
        { role: 'user', content: 'Hello' }
      ]);
    });

    it('should handle user message with null content', () => {
      const messages: GLMMessage[] = [
        { role: 'user', content: null }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([
        { role: 'user', content: '' }
      ]);
    });
  });

  describe('Assistant Messages', () => {
    it('should transform an assistant message without tool calls', () => {
      const messages: GLMMessage[] = [
        { role: 'assistant', content: 'Hi there' }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([
        { role: 'assistant', content: 'Hi there' }
      ]);
    });

    it('should handle assistant message with null content and no tool calls', () => {
      const messages: GLMMessage[] = [
        { role: 'assistant', content: null }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([
        { role: 'assistant', content: '' }
      ]);
    });

    it('should handle assistant message with content and tool calls together', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: 'Let me search for that information.',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ]
        }
      ];

      const result = transformer.transform(messages);

      // Should have 2 messages: one with content, one with tool call
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'Let me search for that information.'
      });
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'search',
          parameters: { query: 'test' },
          status: 'executing'
        }
      });
    });

    it('should handle assistant message with tool calls only (no content)', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ]
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: '',
          toolCall: {
            toolName: 'search',
            parameters: { query: 'test' },
            status: 'executing'
          }
        }
      ]);
    });
  });

  describe('Tool Calls', () => {
    it('should transform assistant message with tool call and successful result', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: 'I will search for you.',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ]
        },
        {
          role: 'tool',
          tool_call_id: 'call_123',
          content: 'Tool "search" executed successfully:\n{"result": "data"}\n(Execution time: 100ms)'
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'I will search for you.'
      });
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'search',
          parameters: { query: 'test' },
          result: { result: 'data' },
          executionTime: 100,
          status: 'completed'
        }
      });
    });

    it('should transform assistant message with tool call and failed result', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ]
        },
        {
          role: 'tool',
          tool_call_id: 'call_123',
          content: 'Tool "search" failed: Network error'
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'search',
          parameters: { query: 'test' },
          status: 'failed',
          error: 'Network error'
        }
      });
    });

    it('should handle multiple tool calls in one assistant message', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: 'I will search and calculate.',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            },
            {
              id: 'call_456',
              type: 'function',
              function: {
                name: 'calculate',
                arguments: JSON.stringify({ expression: '2+2' })
              }
            }
          ]
        },
        {
          role: 'tool',
          tool_call_id: 'call_123',
          content: 'Tool "search" executed successfully:\n{"result": "data"}\n(Execution time: 100ms)'
        },
        {
          role: 'tool',
          tool_call_id: 'call_456',
          content: 'Tool "calculate" executed successfully:\n{"result": 4}\n(Execution time: 50ms)'
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'I will search and calculate.'
      });
      expect(result[1].toolCall?.toolName).toBe('search');
      expect(result[2].toolCall?.toolName).toBe('calculate');
    });

    it('should handle tool call without result (still executing)', () => {
      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: 'Let me check.',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: JSON.stringify({ query: 'test' })
              }
            }
          ]
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'Let me check.'
      });
      expect(result[1]).toEqual({
        role: 'assistant',
        content: '',
        toolCall: {
          toolName: 'search',
          parameters: { query: 'test' },
          status: 'executing'
        }
      });
    });
  });

  describe('System Messages', () => {
    it('should filter out system messages', () => {
      const messages: GLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(2);
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
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const messages: GLMMessage[] = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'search',
                arguments: 'invalid json{'
              }
            }
          ]
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toHaveLength(1);
      expect(result[0].toolCall?.parameters).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle tool message without matching tool call id', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const messages: GLMMessage[] = [
        {
          role: 'tool',
          tool_call_id: 'unknown_id',
          content: 'Tool result'
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No pending tool call found for tool_call_id: unknown_id'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle tool message missing tool_call_id', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const messages: GLMMessage[] = [
        {
          role: 'tool',
          content: 'Tool result'
        }
      ];

      const result = transformer.transform(messages);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Tool message missing tool_call_id:',
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
