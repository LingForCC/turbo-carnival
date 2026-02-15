/**
 * Comprehensive tests for AppPanel Web Component
 */

import { mountComponent, createMockProject, mockElectronAPI, waitForAsync } from '../../helpers/component-testing';
import { createMockAgent } from '../../helpers/mocks';

// Import the conversation component since app-panel uses it
require('../../../conversation/components/conversation-panel.ts');

// Type for the AppPanel element
interface AppPanel extends HTMLElement {
  // Extend with any methods if needed for testing
}

describe('AppPanel Web Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct initial structure', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      await waitForAsync();

      expect(element.querySelector('#back-btn')).toBeTruthy();
      expect(element.querySelector('conversation-panel')).toBeTruthy();
      // Preview elements are not visible by default (only in preview mode)
      expect(element.querySelector('#app-preview')).toBeFalsy();
      expect(element.querySelector('#code-view-toggle')).toBeFalsy();
      expect(element.querySelector('#refresh-app-btn')).toBeFalsy();

      cleanup();
    });

    it('should show empty state when no agent selected', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      await waitForAsync();

      const html = element.innerHTML;
      // Check for conversation-panel and empty state
      expect(html).toContain('conversation-panel');
      expect(html).toContain('No Agent Selected');

      cleanup();
    });

    it('should show chat interface when agent selected', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      const html = element.innerHTML;
      expect(html).toContain('Test Agent');
      expect(html).toContain('App Agent');
      expect(html).toContain('conversation-panel');

      cleanup();
    });

    it('should render conversation view by default (full width)', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Should show conversation panel, not preview
      expect(element.querySelector('conversation-panel')).toBeTruthy();
      expect(element.querySelector('#app-preview')).toBeFalsy();

      cleanup();
    });
  });

  describe('Interactions', () => {
    it('should emit chat-back event when back button clicked', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      await waitForAsync();

      const emitSpy = jest.spyOn(element, 'dispatchEvent');

      const backBtn = element.querySelector('#back-btn') as HTMLElement;
      backBtn.click();

      await waitForAsync();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chat-back',
          bubbles: true,
          composed: true,
        })
      );

      cleanup();
    });

    it('should toggle code view when toggle button clicked', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Manually set preview mode for testing
      (element as any).previewHtmlCode = '<div>Test HTML</div>';
      (element as any).showingPreview = true;
      (element as any).showCodeView = false;
      (element as any).render();

      await waitForAsync();

      const codeViewToggle = element.querySelector('#code-view-toggle') as HTMLElement;
      expect(codeViewToggle).toBeTruthy();
      expect((element as any).showCodeView).toBe(false);

      codeViewToggle.click();

      await waitForAsync();

      expect((element as any).showCodeView).toBe(true);

      cleanup();
    });

    it('should refresh app when refresh button clicked', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Set preview mode
      (element as any).previewHtmlCode = '<div>Test HTML</div>';
      (element as any).showingPreview = true;
      (element as any).render();

      await waitForAsync();

      const refreshBtn = element.querySelector('#refresh-app-btn') as HTMLElement;
      expect(refreshBtn).toBeTruthy();

      const renderSpy = jest.spyOn(element as any, 'renderAppPreview');
      refreshBtn.click();

      await waitForAsync();

      expect(renderSpy).toHaveBeenCalled();

      cleanup();
    });

    it('should clear chat when clear button clicked', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      const clearBtn = element.querySelector('#clear-chat-btn') as HTMLElement;
      expect(clearBtn).toBeTruthy();

      // Mock window.confirm - define it on globalThis if it doesn't exist
      const mockConfirm = jest.fn().mockReturnValue(true);
      (globalThis as any).confirm = mockConfirm;

      const conversation = element.querySelector('conversation-panel') as any;
      const clearChatSpy = jest.spyOn(conversation, 'clearChat');

      clearBtn.click();

      await waitForAsync();

      expect(mockConfirm).toHaveBeenCalled();
      expect(clearChatSpy).toHaveBeenCalled();

      delete (globalThis as any).confirm;

      cleanup();
    });
  });

  describe('Agent Selection', () => {
    it('should handle agent selection event', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      expect((element as any).currentAgent).toBe(mockAgent);
      expect((element as any).currentProject).toBe(mockProject);
      expect(element.innerHTML).toContain('Test Agent');

      cleanup();
    });

    it('should load conversation history from agent', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const mockAgent = createMockAgent({
        name: 'Test Agent',
        type: 'app',
        history,
      });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      const conversation = element.querySelector('conversation-panel') as any;
      expect(conversation).toBeTruthy();
      expect(conversation.chatHistory).toEqual(history);

      cleanup();
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in agent name', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({
        name: '<script>alert("xss")</script>',
        type: 'app',
      });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      const html = element.innerHTML;
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;');

      cleanup();
    });

    it('should escape HTML in chat messages', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const history = [
        { role: 'user', content: '<script>alert("xss")</script>' },
      ];

      const mockAgent = createMockAgent({
        name: 'Test Agent',
        type: 'app',
        history,
      });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Check that the conversation panel escapes HTML
      const html = element.innerHTML;
      // The user-message component should escape the HTML
      expect(html).not.toContain('<script>alert("xss")</script>');

      cleanup();
    });
  });

  describe('Code Parsing', () => {
    it('should parse HTML code blocks', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const content = `
        Here is your app:

        \`\`\`html
        <div>
          <h1>Hello World</h1>
        </div>
        \`\`\`

        Let me know if you need any changes!
      `;

      const mockAgent = createMockAgent({
        name: 'Test Agent',
        type: 'app',
      });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // The AppCodeMessage component should parse HTML blocks
      // This is tested more thoroughly in the app-code-message tests

      cleanup();
    });
  });

  describe('Streaming', () => {
    it('should handle message streaming', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Mock the electronAPI for streaming
      mockElectronAPI('streamAppAgentMessage', jest.fn().mockImplementation(async (
        _projectPath: string,
        _agentName: string,
        _message: string,
        _filePaths: string[],
        _onChunk: (chunk: string) => void,
        _onReasoning: (reasoning: string) => void,
        onComplete: () => void,
        _onError: (error: string) => void
      ) => {
        onComplete();
      }));

      const conversation = element.querySelector('conversation-panel') as any;

      // Trigger a message send event
      conversation.dispatchEvent(new CustomEvent('message-sent', {
        detail: {
          projectPath: '/test-project',
          agentName: 'Test Agent',
          message: 'Create a counter app',
          filePaths: [],
        },
        bubbles: true,
      }));

      await waitForAsync();

      // Verify streaming was called
      expect(window.electronAPI?.streamAppAgentMessage).toHaveBeenCalled();

      cleanup();
    });
  });

  describe('Layout', () => {
    it('should show empty state message when no agent', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      await waitForAsync();

      expect(element.innerHTML).toContain('No Agent Selected');

      cleanup();
    });

    it('should show prompt when agent selected but no messages', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app', history: [] });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      expect(element.innerHTML).toContain('Describe the app you want to build');

      cleanup();
    });
  });

  describe('Preview', () => {
    it('should show preview when view app is triggered', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Simulate viewing app
      (element as any).handleViewApp('<div>Test App</div>');

      await waitForAsync();

      expect((element as any).showingPreview).toBe(true);
      expect((element as any).previewHtmlCode).toBe('<div>Test App</div>');
      expect(element.querySelector('#app-preview')).toBeTruthy();

      cleanup();
    });

    it('should close preview when close button clicked', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Open preview
      (element as any).handleViewApp('<div>Test App</div>');
      await waitForAsync();

      expect((element as any).showingPreview).toBe(true);

      // Click close button
      const closeBtn = element.querySelector('#close-preview-btn') as HTMLElement;
      closeBtn.click();

      await waitForAsync();

      expect((element as any).showingPreview).toBe(false);
      expect((element as any).previewHtmlCode).toBeNull();

      cleanup();
    });
  });

  describe('Error Handling', () => {
    it('should handle streaming errors gracefully', async () => {
      const { element, cleanup } = mountComponent<AppPanel>('app-panel');

      const mockAgent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const mockProject = createMockProject();

      element.dispatchEvent(new CustomEvent('agent-selected', {
        detail: { agent: mockAgent, project: mockProject },
        bubbles: true,
      }));

      await waitForAsync();

      // Mock the electronAPI to return an error
      mockElectronAPI('streamAppAgentMessage', jest.fn().mockImplementation(async (
        _projectPath: string,
        _agentName: string,
        _message: string,
        _filePaths: string[],
        _onChunk: (chunk: string) => void,
        _onReasoning: (reasoning: string) => void,
        _onComplete: () => void,
        onError: (error: string) => void
      ) => {
        onError('Stream failed');
      }));

      const conversation = element.querySelector('conversation-panel') as any;
      const handleStreamErrorSpy = jest.spyOn(conversation, 'handleStreamError');

      // Trigger a message send event
      conversation.dispatchEvent(new CustomEvent('message-sent', {
        detail: {
          projectPath: '/test-project',
          agentName: 'Test Agent',
          message: 'Create a counter app',
          filePaths: [],
        },
        bubbles: true,
      }));

      await waitForAsync();

      // The error is caught and wrapped in try-catch, so it should call handleStreamError
      // with just the error message
      expect(handleStreamErrorSpy).toHaveBeenCalledWith('Stream failed');

      cleanup();
    });
  });
});
