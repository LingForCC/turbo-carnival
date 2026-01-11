import type { Agent, Project, APIKey } from '../global.d.ts';

/**
 * ChatPanel Web Component
 * Interactive chat interface for AI agents in the right sidebar
 */
export class ChatPanel extends HTMLElement {
  private currentProject: Project | null = null;
  private currentAgent: Agent | null = null;
  private apiKeys: APIKey[] = [];
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private isStreaming: boolean = false;
  private currentStreamedContent: string = '';

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
    this.loadAPIKeys();

    // Listen for agent selection events
    this.addEventListener('agent-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.handleAgentSelected(customEvent.detail.agent, customEvent.detail.project);
    });
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex-1 bg-white flex flex-col h-full">
        <!-- Header -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <button id="back-btn" class="p-1.5 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent flex items-center justify-center" aria-label="Back to dashboard">
              <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="flex-1 min-w-0">
              <h2 class="text-sm font-semibold text-gray-800 truncate m-0">
                ${this.currentAgent ? this.escapeHtml(this.currentAgent.name) : 'No Agent Selected'}
              </h2>
              ${this.currentAgent ?
                `<p class="text-xs text-gray-500 truncate m-0 mt-0.5">${this.escapeHtml(this.currentAgent.type)}</p>` :
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
                placeholder="Type your message..."
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
            <div class="flex items-center gap-2 mt-2">
              <label class="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" id="stream-toggle" class="rounded" checked />
                Stream
              </label>
              <span class="text-xs text-gray-400">•</span>
              <span id="model-info" class="text-xs text-gray-500">
                ${this.escapeHtml(this.currentAgent?.config.model || '')}
              </span>
            </div>
          </div>
        ` : `
          <div class="p-4 border-t border-gray-200 shrink-0">
            <p class="text-sm text-gray-400 text-center m-0">
              Select an agent to start chatting
            </p>
          </div>
        `}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderChatContent(): string {
    if (!this.currentAgent) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            Select an agent to start chatting
          </p>
        </div>
      `;
    }

    if (this.chatHistory.length === 0 && !this.isStreaming) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">
            No messages yet. Start a conversation!
          </p>
        </div>
      `;
    }

    // Render chat messages
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

    // Send button
    const sendBtn = this.querySelector('#send-btn');
    const chatInput = this.querySelector('#chat-input') as HTMLTextAreaElement;

    if (sendBtn && chatInput) {
      const newBtn = sendBtn.cloneNode(true);
      sendBtn.replaceWith(newBtn);

      const newInput = chatInput.cloneNode(true);
      chatInput.replaceWith(newInput);
      const actualInput = newInput as HTMLTextAreaElement;

      // Send on button click
      (newBtn as HTMLElement).addEventListener('click', () => this.sendMessage());

      // Send on Enter (Shift+Enter for new line)
      actualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
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

    this.render();
    this.scrollToBottom();
  }

  private async sendMessage(): Promise<void> {
    if (!this.currentAgent || !this.currentProject || this.isStreaming) return;

    const input = this.querySelector('#chat-input') as HTMLTextAreaElement;
    const message = input?.value.trim();

    if (!message) return;

    // Get streaming preference
    const streamToggle = this.querySelector('#stream-toggle') as HTMLInputElement;
    const shouldStream = streamToggle?.checked ?? true;

    // Add user message to UI immediately
    this.chatHistory.push({ role: 'user', content: message });
    this.render();
    this.scrollToBottom();

    // Check if agent has API key configured
    const apiKeyName = this.currentAgent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      this.showError('Agent does not have an API key configured. Please edit the agent settings.');
      this.chatHistory.pop(); // Remove user message
      this.render();
      return;
    }

    // Check if API key exists
    const apiKey = this.apiKeys.find(k => k.name === apiKeyName);
    if (!apiKey) {
      this.showError(`API key "${apiKeyName}" not found. Please add it in settings.`);
      this.chatHistory.pop(); // Remove user message
      this.render();
      return;
    }

    try {
      if (shouldStream) {
        await this.streamMessage(message);
      } else {
        await this.sendNonStreamingMessage(message);
      }
    } catch (error: any) {
      this.showError(`Failed to send message: ${error.message}`);
      this.chatHistory.pop(); // Remove user message
      this.render();
    }
  }

  private async sendNonStreamingMessage(userMessage: string): Promise<void> {
    if (!window.electronAPI || !this.currentProject || !this.currentAgent) return;

    const response = await window.electronAPI.sendChatMessage(
      this.currentProject.path,
      this.currentAgent.name,
      userMessage
    );

    const assistantMessage = response.choices?.[0]?.message?.content;
    if (assistantMessage) {
      this.chatHistory.push({ role: 'assistant', content: assistantMessage });
      this.render();
      this.scrollToBottom();
    }
  }

  private async streamMessage(userMessage: string): Promise<void> {
    if (!window.electronAPI || !this.currentProject || !this.currentAgent) return;

    this.isStreaming = true;
    this.currentStreamedContent = '';

    // Add empty assistant message that will be updated
    this.chatHistory.push({ role: 'assistant', content: '' });
    this.render();

    await window.electronAPI.streamChatMessage(
      this.currentProject.path,
      this.currentAgent.name,
      userMessage,
      // onChunk
      (chunk: string) => {
        this.currentStreamedContent += chunk;
        // Update the last message (assistant's response)
        this.chatHistory[this.chatHistory.length - 1].content = this.currentStreamedContent;
        this.render();
        this.scrollToBottom();
      },
      // onComplete
      () => {
        this.isStreaming = false;
        this.render();
      },
      // onError
      (error: string) => {
        this.isStreaming = false;
        this.showError(error);
        this.render();
      }
    );
  }

  private clearChat(): void {
    if (!this.currentAgent) return;

    const confirmed = confirm(
      'Are you sure you want to clear the chat history? This will not delete the conversation from the agent file.'
    );

    if (confirmed) {
      this.chatHistory = [];
      this.render();
    }
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

  private async loadAPIKeys(): Promise<void> {
    if (window.electronAPI) {
      try {
        this.apiKeys = await window.electronAPI.getAPIKeys();
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    }
  }

  private goBack(): void {
    this.dispatchEvent(new CustomEvent('chat-back', {
      bubbles: true,
      composed: true
    }));
  }
}

// Register the custom element
customElements.define('chat-panel', ChatPanel);
