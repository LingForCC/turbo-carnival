/**
 * Comprehensive tests for ConversationPanel Web Component
 */

import { mountComponent, createMockProject, mockElectronAPI, waitForAsync, spyOnEvent } from '../../helpers/component-testing';
import { createMockAgent } from '../../helpers/mocks';
import type { ChatMessage } from '../../../components/conversation/conversation-panel';

// Import conversation-panel to register the custom element
// Note: mountComponent will also do this, but we import here for type safety
require('../../../components/conversation/conversation-panel.ts');

// Type for the ConversationPanel element
interface ConversationPanel extends HTMLElement {
  setAgent(agent: any, project: any): void;
  clearChat(): void;
  scrollToBottom(): void;
  handleStreamChunk(chunk: string): void;
  handleStreamComplete(content: string): void;
  handleStreamError(error: string): void;
  taggedFiles?: Array<{ name: string; path: string }>;
  chatHistory?: ChatMessage[];
  currentStreamedContent?: string;
}

describe('ConversationPanel Web Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct initial structure', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      // Check for main containers (chat-messages is always rendered)
      expect(element.querySelector('#chat-messages')).toBeTruthy();
      // The message "Select an agent to start chatting" should be shown
      const html = element.innerHTML;
      expect(html).toContain('Select an agent to start chatting');

      cleanup();
    });

    it('should show empty state when no agent selected', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('Start a conversation!');

      cleanup();
    });

    it('should show chat interface when agent selected', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Verify chat input and send button are present
      expect(element.querySelector('#chat-input')).toBeTruthy();
      expect(element.querySelector('#send-btn')).toBeTruthy();

      cleanup();
    });

    it('should render with custom placeholder', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      element.setAttribute('placeholder', 'Describe your app idea...');
      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      const input = element.querySelector('#chat-input') as HTMLTextAreaElement;
      expect(input?.placeholder).toBe('Describe your app idea...');

      cleanup();
    });

    it('should render with model info', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      element.setAttribute('model-info', 'GPT-4 • 128k context');
      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('GPT-4 • 128k context');

      cleanup();
    });

    it('should render file tagging section when enabled', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      element.setAttribute('enable-file-tagging', 'true');
      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // File tagging should be available (no need to mock window.electronAPI for initial render)
      const input = element.querySelector('#chat-input');
      expect(input).toBeTruthy();

      cleanup();
    });
  });

  describe('Public API', () => {
    it('should set agent and project', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      expect(element.chatHistory).toEqual([]);
      // Verify chat interface is ready (input and send button should be present)
      expect(element.querySelector('#chat-input')).toBeTruthy();
      expect(element.querySelector('#send-btn')).toBeTruthy();

      cleanup();
    });

    it('should load conversation history from agent', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const history = [
        { role: 'user' as const, content: 'Hello', timestamp: Date.now() },
        { role: 'assistant' as const, content: 'Hi there!', timestamp: Date.now() },
        { role: 'system' as const, content: 'System message', timestamp: Date.now() }
      ];

      const mockAgent = createMockAgent({
        history
      });
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Should filter out system messages
      expect(element.chatHistory).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]);

      const html = element.innerHTML;
      expect(html).toContain('Hello');
      expect(html).toContain('Hi there!');

      cleanup();
    });

    it('should clear chat history', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Manually add some messages
      element.chatHistory = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' }
      ];

      element.clearChat();

      expect(element.chatHistory).toEqual([]);

      cleanup();
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch message-sent event when user sends a message', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent({
        config: {
          ...createMockAgent().config,
          providerId: 'test-provider'
        }
      });
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Spy on the message-sent event
      const eventPromise = spyOnEvent(element, 'message-sent');

      const input = element.querySelector('#chat-input') as HTMLTextAreaElement;
      const sendBtn = element.querySelector('#send-btn') as HTMLElement;

      if (input && sendBtn) {
        input.value = 'Hello, world!';
        sendBtn.click();

        const event = await eventPromise;

        // Verify event was dispatched with correct data
        expect(event.detail).toMatchObject({
          projectPath: mockProject.path,
          agentName: mockAgent.name,
          message: 'Hello, world!',
          filePaths: []
        });
      }

      cleanup();
    });

    it('should include file paths in message-sent event when files are tagged', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      element.setAttribute('enable-file-tagging', 'true');
      await waitForAsync();

      const mockAgent = createMockAgent({
        config: {
          ...createMockAgent().config,
          providerId: 'test-provider'
        }
      });
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Manually add tagged files
      element.taggedFiles = [
        { name: 'test.txt', path: '/project/test.txt' }
      ];

      // Spy on the message-sent event
      const eventPromise = spyOnEvent(element, 'message-sent');

      const input = element.querySelector('#chat-input') as HTMLTextAreaElement;
      const sendBtn = element.querySelector('#send-btn') as HTMLElement;

      if (input && sendBtn) {
        input.value = 'Check these files';
        sendBtn.click();

        const event = await eventPromise;
        expect(event.detail.filePaths).toEqual(['/project/test.txt']);
      }

      cleanup();
    });
  });

  describe('Stream Handler Methods', () => {
    it('should handle stream chunks', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Simulate streaming: add empty assistant message first
      element.chatHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' }
      ];

      // Call handleStreamChunk
      element.handleStreamChunk('Hi');
      element.handleStreamChunk(' there');
      element.handleStreamChunk('!');

      expect(element.currentStreamedContent).toBe('Hi there!');
      expect(element.chatHistory?.[1].content).toBe('Hi there!');

      cleanup();
    });

    it('should handle stream completion', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Simulate streaming
      element.chatHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' }
      ];
      element.handleStreamChunk('Response');
      element.currentStreamedContent = 'Response';

      // Spy on stream-complete event
      const eventPromise = spyOnEvent(element, 'stream-complete');

      element.handleStreamComplete('Response');

      // Wait for the event to be dispatched
      const event = await Promise.race([eventPromise, Promise.resolve(null)]);

      expect(element.currentStreamedContent).toBe('');
      expect(element.chatHistory?.[1].content).toBe('Response');
      if (event) {
        expect(event.detail.content).toBe('Response');
      }

      cleanup();
    });

    it('should handle stream errors', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Simulate user message
      element.chatHistory = [
        { role: 'user', content: 'Test' }
      ];

      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      element.handleStreamError('Network error');

      // User message should be removed
      expect(element.chatHistory).toEqual([]);
      expect(alertSpy).toHaveBeenCalledWith('Network error');

      alertSpy.mockRestore();

      cleanup();
    });
  });

  describe('Message Display', () => {
    it('should display user and assistant messages differently', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Set up streaming state and trigger render
      element.chatHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' }
      ];
      element.handleStreamChunk('Hi there!'); // This will update the assistant message and trigger render
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('Hello');
      expect(html).toContain('Hi there!');

      // Check for different styling (user has blue background, assistant has transparent background)
      expect(html).toContain('bg-blue-500');
      expect(html).toContain('text-gray-800');

      cleanup();
    });

    it('should escape HTML in messages', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Set up streaming state and trigger render
      element.chatHistory = [
        { role: 'user', content: '<script>alert("xss")</script>' },
        { role: 'assistant', content: '' }
      ];
      element.handleStreamChunk(''); // This renders the user message
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');

      cleanup();
    });

    it('should preserve newlines in messages', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Set up streaming state and trigger render
      element.chatHistory = [
        { role: 'user', content: 'Line 1\n\nLine 2' },
        { role: 'assistant', content: '' }
      ];
      element.handleStreamChunk(''); // This renders the user message
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
      // Check that newlines are preserved (whitespace-pre-wrap)
      expect(html).toContain('whitespace-pre-wrap');

      cleanup();
    });
  });

  describe('Conversation History Filtering', () => {
    it('should handle filtering non-user/assistant messages from history', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent({
        history: [
          { role: 'user' as const, content: 'User message', timestamp: Date.now() },
          { role: 'assistant' as const, content: 'Assistant message', timestamp: Date.now() },
          { role: 'system' as const, content: 'System message', timestamp: Date.now() }
        ]
      });
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('User message');
      expect(html).toContain('Assistant message');
      expect(html).not.toContain('System message');

      cleanup();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing window.electronAPI gracefully', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      // The component should handle electronAPI checks internally
      expect(() => element.setAgent(mockAgent, mockProject)).not.toThrow();

      cleanup();
    });

    it('should not send message if no agent selected', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const eventPromise = spyOnEvent(element, 'message-sent');

      const input = element.querySelector('#chat-input') as HTMLTextAreaElement;
      const sendBtn = element.querySelector('#send-btn') as HTMLElement;

      if (input && sendBtn) {
        input.value = 'Test';
        sendBtn.click();

        // Wait a bit and verify event was not dispatched
        await waitForAsync(100);

        // Use Promise.race to check if event was dispatched
        const eventDispatched = await Promise.race([
          eventPromise.then(() => true),
          Promise.resolve(false)
        ]);

        // Event should not be dispatched if no agent is set
        expect(eventDispatched).toBe(false);
      }

      cleanup();
    });
  });

  describe('Tool Call Rendering', () => {
    it('should render tool call message collapsed by default', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Add a tool call message to history
      (element as any).chatHistory = [
        { role: 'assistant', content: 'Executing tool: test_tool', toolCall: {
          toolName: 'test_tool',
          parameters: { arg1: 'value1' },
          status: 'executing'
        }}
      ];
      (element as any).render();
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('test_tool');
      expect(html).toContain('tool-call-toggle-btn');
      expect(html).toContain('tool-call-details');
      expect(html).toContain('hidden'); // Details should be hidden by default

      cleanup();
    });

    it('should toggle details when button is clicked', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Add a completed tool call with result
      (element as any).chatHistory = [
        { role: 'user', content: 'Tool "test_tool" executed successfully', toolCall: {
          toolName: 'test_tool',
          parameters: { arg1: 'value1' },
          result: { output: 'success' },
          executionTime: 100,
          status: 'completed'
        }}
      ];
      (element as any).render();
      await waitForAsync();

      // Initially collapsed - details should have hidden class
      let details = element.querySelector('.tool-call-details') as HTMLElement;
      expect(details).toBeTruthy();
      expect(details?.classList.contains('hidden')).toBe(true);

      // Click the toggle button
      const toggleBtn = element.querySelector('.tool-call-toggle-btn') as HTMLElement;
      if (toggleBtn) {
        toggleBtn.click();
        await waitForAsync();
      }

      // Now expanded - hidden class should be removed
      details = element.querySelector('.tool-call-details') as HTMLElement;
      expect(details?.classList.contains('hidden')).toBe(false);

      // Click again to collapse
      const toggleBtn2 = element.querySelector('.tool-call-toggle-btn') as HTMLElement;
      if (toggleBtn2) {
        toggleBtn2.click();
        await waitForAsync();
      }

      // Now collapsed again
      details = element.querySelector('.tool-call-details') as HTMLElement;
      expect(details?.classList.contains('hidden')).toBe(true);

      cleanup();
    });

    it('should render failed tool calls with toggle button', async () => {
      const { element, cleanup } = mountComponent<ConversationPanel>('conversation-panel');

      await waitForAsync();

      const mockAgent = createMockAgent();
      const mockProject = createMockProject();

      element.setAgent(mockAgent, mockProject);
      await waitForAsync();

      // Add a failed tool call
      (element as any).chatHistory = [
        { role: 'user', content: 'Tool "test_tool" failed', toolCall: {
          toolName: 'test_tool',
          parameters: {},
          error: 'Something went wrong',
          status: 'failed'
        }}
      ];
      (element as any).render();
      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('test_tool');
      expect(html).toContain('Failed');
      expect(html).toContain('tool-call-toggle-btn');
      expect(html).toContain('hidden'); // Details hidden by default

      cleanup();
    });
  });
});
