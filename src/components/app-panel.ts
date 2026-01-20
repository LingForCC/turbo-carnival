import type { Agent, Project, App } from '../global.d.ts';

/**
 * AppPanel Web Component
 * Split-panel interface for App-type agents with chat (left) and app preview (right)
 */
export class AppPanel extends HTMLElement {
  private currentProject: Project | null = null;
  private currentAgent: Agent | null = null;
  private currentApp: App | null = null;
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private isStreaming: boolean = false;
  private currentStreamedContent: string = '';
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
      <div class="flex-1 bg-white flex flex-row h-full overflow-hidden">
        <!-- Left Panel: Chat Interface (20-30%) -->
        <div class="w-1/4 min-w-[200px] max-w-[400px] flex flex-col border-r border-gray-200">
          <!-- Chat Header -->
          <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <button id="back-btn" class="p-1.5 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent">
                <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-semibold text-gray-800 truncate m-0">
                  ${this.currentAgent ? this.escapeHtml(this.currentAgent.name) : 'No Agent Selected'}
                </h2>
                ${this.currentAgent ?
                  `<p class="text-xs text-gray-500 truncate m-0 mt-0.5">App Agent</p>` :
                  ''
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${this.currentAgent ? `
                <button id="clear-chat-btn" class="p-1.5 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent" title="Clear chat">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Chat Messages Area -->
          <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
            ${this.renderChatContent()}
          </div>

          <!-- Input Area -->
          ${this.currentAgent ? `
            <div class="p-4 border-t border-gray-200 shrink-0">
              <div class="flex gap-2">
                <textarea
                  id="chat-input"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the app you want to build..."
                  rows="2"
                  ${this.isStreaming ? 'disabled' : ''}
                ></textarea>
                <button
                  id="send-btn"
                  class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer border-0 self-end"
                  ${this.isStreaming ? 'disabled' : ''}
                >
                  ${this.isStreaming ?
                    '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>' :
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>'
                  }
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Right Panel: App Preview (70-80%) -->
        <div class="flex-1 min-w-0 flex flex-col bg-gray-50">
          <!-- App Preview Header -->
          <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
            <h3 class="text-sm font-semibold text-gray-800 m-0">App Preview</h3>
            <div class="flex items-center gap-2">
              <button id="code-view-toggle" class="px-3 py-1.5 text-sm hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
                <span>${this.showCodeView ? 'Hide Code' : 'Show Code'}</span>
              </button>
              <button id="refresh-app-btn" class="px-3 py-1.5 text-sm hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent flex items-center gap-1.5" title="Reload App">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">HTML</h4>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.html || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">Renderer JavaScript</h4>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.rendererCode || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">Main Process JavaScript</h4>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(this.currentApp?.mainCode || '')}</code></pre>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">Data</h4>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-w-full"><code>${this.escapeHtml(JSON.stringify(this.currentApp?.data || {}, null, 2))}</code></pre>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Live Preview -->
              <iframe id="app-preview" class="w-full h-full border-0 bg-white"></iframe>
            `}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderAppPreview();
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

    // Send button and chat input
    const sendBtn = this.querySelector('#send-btn');
    const chatInput = this.querySelector('#chat-input') as HTMLTextAreaElement;

    if (sendBtn && chatInput) {
      const newBtn = sendBtn.cloneNode(true);
      sendBtn.replaceWith(newBtn);

      const newInput = chatInput.cloneNode(true);
      chatInput.replaceWith(newInput);
      const actualInput = newInput as HTMLTextAreaElement;

      (newBtn as HTMLElement).addEventListener('click', () => this.sendMessage());

      actualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
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

  private async handleAgentSelected(agent: Agent, project: Project): Promise<void> {
    this.currentAgent = agent;
    this.currentProject = project;

    // Load conversation history from agent
    this.chatHistory = (agent.history || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

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

  private renderChatContent(): string {
    if (!this.currentAgent) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            Select an App agent to start building
          </p>
        </div>
      `;
    }

    if (this.chatHistory.length === 0 && !this.isStreaming) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            Describe the app you want to build...
          </p>
        </div>
      `;
    }

    return this.chatHistory.map(msg => this.renderMessage(msg.role, msg.content)).join('');
  }

  private renderMessage(role: 'user' | 'assistant', content: string): string {
    const isUser = role === 'user';
    return `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }">
          <p class="text-sm whitespace-pre-wrap break-words m-0">${this.escapeHtml(content)}</p>
        </div>
      </div>
    `;
  }

  private async sendMessage(): Promise<void> {
    if (!this.currentAgent || !this.currentProject || this.isStreaming) return;

    const input = this.querySelector('#chat-input') as HTMLTextAreaElement;
    const message = input?.value.trim();

    if (!message) return;

    // Add user message to UI immediately
    this.chatHistory.push({ role: 'user', content: message });
    this.render();
    this.scrollToBottom();

    try {
      await this.streamMessage(message);
    } catch (error: any) {
      this.showError(`Failed to send message: ${error.message}`);
      this.chatHistory.pop();
      this.render();
    }
  }

  private async streamMessage(userMessage: string): Promise<void> {
    if (!window.electronAPI || !this.currentProject || !this.currentAgent) return;

    this.isStreaming = true;
    this.currentStreamedContent = '';

    this.chatHistory.push({ role: 'assistant', content: '' });
    this.render();

    await window.electronAPI.streamChatMessage(
      this.currentProject.path,
      this.currentAgent.name,
      userMessage,
      undefined,
      (chunk: string) => {
        this.currentStreamedContent += chunk;
        this.chatHistory[this.chatHistory.length - 1].content = this.currentStreamedContent;
        this.render();
        this.scrollToBottom();
      },
      () => {
        this.isStreaming = false;
        this.parseAndUpdateApp();
        this.render();
      },
      (error: string) => {
        this.isStreaming = false;
        this.showError(error);
        this.render();
      }
    );
  }

  private async parseAndUpdateApp(): Promise<void> {
    // Parse the AI response for app code updates
    // Look for patterns like:
    // ```html ... ```
    // ```renderer-js ... ```
    // ```main-js ... ```

    const lastMessage = this.chatHistory[this.chatHistory.length - 1]?.content || '';

    // Extract HTML code block
    const htmlMatch = lastMessage.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch && this.currentApp) {
      this.currentApp.html = htmlMatch[1];
    }

    // Extract renderer JS code block
    const rendererMatch = lastMessage.match(/```renderer-js\n([\s\S]*?)\n```/);
    if (rendererMatch && this.currentApp) {
      this.currentApp.rendererCode = rendererMatch[1];
    }

    // Extract main process JS code block
    const mainMatch = lastMessage.match(/```main-js\n([\s\S]*?)\n```/);
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

    this.chatHistory = [];
    this.render();
  }

  private scrollToBottom(): void {
    const messagesContainer = this.querySelector('#chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private showError(message: string): void {
    alert(message);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private goBack(): void {
    this.dispatchEvent(new CustomEvent('chat-back', {
      bubbles: true,
      composed: true
    }));
  }
}

// Register the custom element
customElements.define('app-panel', AppPanel);
