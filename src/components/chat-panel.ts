import type { Agent, Project, APIKey } from '../global.d.ts';

/**
 * ChatPanel Web Component
 * Interactive chat interface for AI agents in the right sidebar
 *
 * Listens for 'message-sent' events from conversation-panel and routes them
 * through the chat-agent IPC channels.
 */
export class ChatPanel extends HTMLElement {
  private currentProject: Project | null = null;
  private currentAgent: Agent | null = null;
  private apiKeys: APIKey[] = [];

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachConversationListeners();
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

        <!-- Conversation Component -->
        <conversation-panel
          id="conversation"
          enable-file-tagging="true"
          show-stream-toggle="true"
          placeholder="Type @ to mention files..."
          model-info="${this.currentAgent ? this.escapeHtml(this.currentAgent.config.model || '') : ''}">
        </conversation-panel>
      </div>
    `;

    this.attachEventListeners();
    this.attachConversationListeners();

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
  }

  private attachConversationListeners(): void {
    const conversation = this.querySelector('#conversation') as any;
    if (!conversation) return;

    // Pass API keys to conversation component
    if (conversation.setAPIKeys) {
      conversation.setAPIKeys(this.apiKeys);
      conversation.setRequireAPIKeyValidation(true);
    }

    // Listen for message-sent events from conversation-panel
    // This event is dispatched when user sends a message
    conversation.addEventListener('message-sent', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { projectPath, agentName, message, filePaths, shouldStream } = customEvent.detail;

      try {
        if (shouldStream) {
          await this.handleStreamMessage(projectPath, agentName, message, filePaths, conversation);
        } else {
          await this.handleSendMessage(projectPath, agentName, message, filePaths, conversation);
        }
      } catch (error: any) {
        conversation.handleStreamError(`Failed to send message: ${error.message}`);
      }
    });

    // Note: We don't clone-and-replace here to avoid removing the back button listener
    // that was just attached in attachEventListeners()
    conversation.addEventListener('back-clicked', () => {
      this.goBack();
    });

    conversation.addEventListener('chat-cleared', () => {
      // Optional: Update parent state if needed
    });
  }

  /**
   * Handle non-streaming message via chat-agent IPC
   */
  private async handleSendMessage(
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[],
    conversation: any
  ): Promise<void> {
    if (!window.electronAPI) return;

    // Call new chat-agent IPC channel
    // The handler returns the final message string directly
    const assistantMessage = await (window.electronAPI as any).sendChatAgentMessage(
      projectPath,
      agentName,
      message,
      filePaths
    );

    if (assistantMessage) {
      // Add assistant message to conversation-panel
      const currentHistory = conversation.chatHistory || [];
      conversation.chatHistory = [...currentHistory, { role: 'assistant', content: assistantMessage }];
      conversation.render();
      conversation.scrollToBottom();

      // Emit stream-complete event for consistency
      conversation.dispatchEvent(new CustomEvent('stream-complete', {
        detail: { content: assistantMessage },
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Handle streaming message via chat-agent IPC
   */
  private async handleStreamMessage(
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

    // Call new chat-agent stream IPC channel
    await (window.electronAPI as any).streamChatAgentMessage(
      projectPath,
      agentName,
      message,
      filePaths,
      // onChunk - delegate to conversation-panel
      (chunk: string) => conversation.handleStreamChunk(chunk),
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

    // Update conversation component
    const conversation = this.querySelector('#conversation') as any;
    if (conversation) {
      conversation.setAgent(agent, project);
      conversation.setAPIKeys(this.apiKeys);
      conversation.setRequireAPIKeyValidation(true);
    }

    // Update header
    this.render();
  }

  private clearChat(): void {
    if (!this.currentAgent) return;

    const confirmed = confirm(
      'Are you sure you want to clear the chat history? This will not delete the conversation from the agent file.'
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

  private async loadAPIKeys(): Promise<void> {
    if (window.electronAPI) {
      try {
        this.apiKeys = await window.electronAPI.getAPIKeys();
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
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
}

// Register the custom element
customElements.define('chat-panel', ChatPanel);
