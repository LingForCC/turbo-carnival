import type { Agent, Project, App } from '../global.d.ts';
import {
  renderAppContent,
  type MessageRenderers
} from './conversation/message-render';
import type { ToolCallData } from './conversation/conversation-panel';
import { AssistantMessage } from './conversation/assistant-message';
import { UserMessage } from './conversation/user-message';
import { ToolCallMessage } from './conversation/tool-call-message';

/**
 * AppPanel Web Component
 * Split-panel interface for App-type agents with chat (left) and app preview (right)
 *
 * Listens for 'message-sent' events from conversation-panel and routes them
 * through the app-agent IPC channels (files only, no tools).
 */
export class AppPanel extends HTMLElement {
  private currentProject: Project | null = null;
  private currentAgent: Agent | null = null;
  private currentApp: App | null = null;
  private showCodeView: boolean = false;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();

    // Listen for agent selection events
    this.addEventListener('agent-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.handleAgentSelected(customEvent.detail.agent, customEvent.detail.project);
    });
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex-1 bg-white dark:bg-gray-900 flex flex-row h-full overflow-hidden">
        <!-- Left Panel: Chat Interface (20-30%) -->
        <div class="w-1/4 min-w-[200px] max-w-[400px] flex flex-col border-r border-gray-200 dark:border-gray-700">
          <!-- Chat Header -->
          <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <button id="back-btn" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate m-0">
                  ${this.currentAgent ? this.escapeHtml(this.currentAgent.name) : 'No Agent Selected'}
                </h2>
                ${this.currentAgent ?
                  `<p class="text-xs text-gray-500 dark:text-gray-400 truncate m-0 mt-0.5">App Agent</p>` :
                  ''
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${this.currentAgent ? `
                <button id="clear-chat-btn" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent" title="Clear chat">
                  <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Conversation Component -->
          <conversation-panel
            id="conversation"
            placeholder="Describe the app you want to build...">
          </conversation-panel>
        </div>

        <!-- Right Panel: App Preview (70-80%) -->
        <div class="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-800">
          <!-- App Preview Header -->
          <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 m-0">App Preview</h3>
            <div class="flex items-center gap-2">
              <button id="code-view-toggle" class="px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
                <span>${this.showCodeView ? 'Hide Code' : 'Show Code'}</span>
              </button>
              <button id="refresh-app-btn" class="px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent flex items-center gap-1.5" title="Reload App">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Reload</span>
              </button>
            </div>
          </div>

          <!-- App Preview Content -->
          <div class="flex-1 overflow-hidden relative">
            ${this.showCodeView ? `
              <!-- Code View -->
              <div class="h-full overflow-auto p-4 min-w-0">
                <div class="space-y-4">
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">HTML</h4>
                    <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.html || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Renderer JavaScript</h4>
                    <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.rendererCode || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Main Process JavaScript</h4>
                    <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.mainCode || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Data</h4>
                    <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(JSON.stringify(this.currentApp?.data || {}, null, 2))}</code></pre>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Live Preview -->
              <iframe id="app-preview" class="w-full h-full border-0 bg-white dark:bg-gray-900"></iframe>
            `}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.attachConversationListeners();
    this.renderAppPreview();

    // Update conversation component if agent is already set
    if (this.currentAgent && this.currentProject) {
      const conversation = this.querySelector('#conversation') as any;
      if (conversation) {
        conversation.setAgent(this.currentAgent, this.currentProject);
      }
    }
  }

  private attachEventListeners(): void {
    // Back button
    const backBtn = this.querySelector('#back-btn');
    if (backBtn) {
      const newBtn = backBtn.cloneNode(true);
      backBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.goBack());
    }

    // Clear chat button
    const clearBtn = this.querySelector('#clear-chat-btn');
    if (clearBtn) {
      const newBtn = clearBtn.cloneNode(true);
      clearBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.clearChat());
    }

    // Code view toggle
    const codeViewToggle = this.querySelector('#code-view-toggle');
    if (codeViewToggle) {
      const newBtn = codeViewToggle.cloneNode(true);
      codeViewToggle.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => {
        this.showCodeView = !this.showCodeView;
        this.render();
      });
    }

    // Refresh app button
    const refreshBtn = this.querySelector('#refresh-app-btn');
    if (refreshBtn) {
      const newBtn = refreshBtn.cloneNode(true);
      refreshBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.renderAppPreview());
    }
  }

  private attachConversationListeners(): void {
    const conversation = this.querySelector('#conversation') as any;
    if (!conversation) return;

    // Inject message renderers into conversation-panel
    // Use renderAppContent for assistant messages to show HTML code blocks as callouts
    const messageRenderers: MessageRenderers = {
      renderAssistantMessage: (content, reasoning?) => renderAppContent(content, reasoning)
    };
    conversation.setRenderers(messageRenderers);

    // Create and inject the user message factory
    const createUserMessage = (content: string): UserMessage => {
      return UserMessage.create(content);
    };
    conversation.setUserMessageFactory(createUserMessage);

    // Create and inject the assistant message factory
    // The factory closes over the app-panel's context, allowing access to currentProject
    const createAssistantMessage = (content: string, reasoning: string): AssistantMessage => {
      return AssistantMessage.createWithHandlers(
        content,
        reasoning,
        // Save handler - uses currentProject from app-panel's context
        async (content: string) => {
          if (!this.currentProject) {
            console.warn('[AppPanel] No project selected, cannot save message');
            return;
          }
          try {
            await window.electronAPI?.saveMessageToFile(this.currentProject.path, content);
          } catch (error: any) {
            console.error('[AppPanel] Failed to save message:', error);
            throw error;
          }
        }
      );
    };
    conversation.setAssistantMessageFactory(createAssistantMessage);

    // Create and inject the tool call message factory
    const createToolCallMessage = (content: string, toolCall: ToolCallData, reasoning?: string): ToolCallMessage => {
      return ToolCallMessage.createWithHandlers(content, toolCall, reasoning);
    };
    conversation.setToolCallMessageFactory(createToolCallMessage);

    // Listen for message-sent events from conversation-panel
    // This event is dispatched when user sends a message
    conversation.addEventListener('message-sent', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { projectPath, agentName, message, filePaths } = customEvent.detail;

      try {
        await this.handleAppAgentStream(projectPath, agentName, message, filePaths, conversation);
      } catch (error: any) {
        conversation.handleStreamError(`Failed to send message: ${error.message}`);
      }
    });

    // Listen for clear-chat events from conversation-panel
    conversation.addEventListener('clear-chat', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { projectPath, agentName } = customEvent.detail;

      try {
        await window.electronAPI?.clearAppAgentHistory(projectPath, agentName);
      } catch (error: any) {
        console.error('Failed to clear agent history:', error);
      }
    });

    // Note: We don't clone-and-replace here to avoid removing the back button listener
    // that was just attached in attachEventListeners()

    // Listen for stream completion to parse and update app
    conversation.addEventListener('stream-complete', async (e: Event) => {
      const customEvent = e as CustomEvent;
      await this.parseAndUpdateApp(customEvent.detail.content);
    });

    conversation.addEventListener('back-clicked', () => {
      this.goBack();
    });
  }

  /**
   * Handle streaming message via app-agent IPC
   * App agents always use streaming (no stream toggle)
   */
  private async handleAppAgentStream(
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[],
    conversation: any
  ): Promise<void> {
    if (!window.electronAPI) return;

    // Add empty assistant message to history before streaming starts
    const currentHistory = conversation.chatHistory || [];
    conversation.chatHistory = [...currentHistory, { role: 'assistant', content: '' }];
    conversation.render();
    conversation.scrollToBottom();

    // Call new app-agent stream IPC channel
    await (window.electronAPI as any).streamAppAgentMessage(
      projectPath,
      agentName,
      message,
      filePaths,
      // onChunk - delegate to conversation-panel
      (chunk: string) => conversation.handleStreamChunk(chunk),
      // onReasoning - delegate to conversation-panel
      (reasoning: string) => conversation.handleStreamReasoning(reasoning),
      // onComplete - delegate to conversation-panel
      () => {
        conversation.handleStreamComplete(conversation.currentStreamedContent || '');
      },
      // onError - delegate to conversation-panel
      (error: string) => conversation.handleStreamError(error)
    );
  }

  private async handleAgentSelected(agent: Agent, project: Project): Promise<void> {
    this.currentAgent = agent;
    this.currentProject = project;

    // Load app for this agent
    if (window.electronAPI) {
      try {
        this.currentApp = await window.electronAPI.getApp(project.path, agent.name);

        // Create app if it doesn't exist
        if (!this.currentApp) {
          this.currentApp = {
            name: agent.name,
            agentName: agent.name,
            html: '<div><p>App will be generated based on your conversation...</p></div>',
            rendererCode: 'console.log("App initialized");',
            mainCode: '',
            data: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          await window.electronAPI.saveApp(project.path, this.currentApp);
        }
      } catch (error) {
        console.error('Failed to load app:', error);
        this.currentApp = null;
      }
    }

    // Update conversation component
    const conversation = this.querySelector('#conversation') as any;
    if (conversation) {
      conversation.setAgent(agent, project);
    }

    this.render();
  }

  private renderAppPreview(): void {
    if (!this.showCodeView && this.currentApp) {
      const iframe = this.querySelector('#app-preview') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              </style>
            </head>
            <body>
              ${this.currentApp.html}
              <script>
                // App execution context
                (function() {
                  ${this.currentApp.rendererCode}
                })();
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }

  private async parseAndUpdateApp(content: string): Promise<void> {
    // Parse the AI response for app code updates
    // Look for patterns like:
    // ```html ... ```
    // ```renderer-js ... ```
    // ```main-js ... ```

    // Extract HTML code block
    const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch && this.currentApp) {
      this.currentApp.html = htmlMatch[1];
    }

    // Extract renderer JS code block
    const rendererMatch = content.match(/```renderer-js\n([\s\S]*?)\n```/);
    if (rendererMatch && this.currentApp) {
      this.currentApp.rendererCode = rendererMatch[1];
    }

    // Extract main process JS code block
    const mainMatch = content.match(/```main-js\n([\s\S]*?)\n```/);
    if (mainMatch && this.currentApp) {
      this.currentApp.mainCode = mainMatch[1];
    }

    // Save updated app
    if (this.currentApp && window.electronAPI && this.currentProject) {
      try {
        await window.electronAPI.saveApp(this.currentProject.path, this.currentApp);
        this.renderAppPreview();
      } catch (error) {
        console.error('Failed to save app:', error);
      }
    }
  }

  private clearChat(): void {
    if (!this.currentAgent) return;

    const confirmed = confirm(
      'Are you sure you want to clear the chat history? This will also delete the conversation from the agent file.'
    );

    if (confirmed) {
      const conversation = this.querySelector('#conversation') as any;
      if (conversation) {
        conversation.clearChat();
      }
    }
  }

  private goBack(): void {
    this.dispatchEvent(new CustomEvent('chat-back', {
      bubbles: true,
      composed: true
    }));
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('app-panel', AppPanel);
