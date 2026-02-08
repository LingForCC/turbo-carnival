import { getQuickAIManagementAPI } from '../api/quick-ai-management';
import { getSettingsManagementAPI } from '../api/settings-management';
import { UserMessage } from './conversation/user-message';
import { AssistantMessage } from './conversation/assistant-message';
import type { QuickAIManagementAPI } from '../types/quick-ai-management';
import type { SettingsManagementAPI } from '../types/settings-management';

/**
 * QuickAIWindow - Quick AI Conversation Web Component
 *
 * Features:
 * - Quick AI conversation interface (no pre-created agent needed)
 * - Uses default model/provider from settings
 * - Error handling when settings not configured
 * - Dark mode support synced with app settings
 * - No persistence - conversation data lost when window closes
 */
export class QuickAIWindow extends HTMLElement {
  private api: QuickAIManagementAPI;
  private settingsAPI: SettingsManagementAPI;
  private currentTheme: 'light' | 'dark' = 'light';
  private settingsValid: boolean = false;
  private settingsError: string = '';
  private isStreaming: boolean = false;
  private unsubscribeWindowShown: (() => void) | null = null;

  constructor() {
    super();
    this.api = getQuickAIManagementAPI();
    this.settingsAPI = getSettingsManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    // Load theme preference first, before rendering
    await this.loadTheme();
    await this.validateSettings();
    this.render();
    this.attachEventListeners();
    await this.attachConversationListeners();
    this.setupWindowShownListener();
  }

  disconnectedCallback(): void {
    // Clean up window shown listener
    if (this.unsubscribeWindowShown) {
      this.unsubscribeWindowShown();
      this.unsubscribeWindowShown = null;
    }
  }

  /**
   * Load theme preference from settings
   */
  private async loadTheme(): Promise<void> {
    try {
      const settings = await this.settingsAPI.getSettings();
      this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
      this.applyTheme();
    } catch (error) {
      console.error('Failed to load theme:', error);
      this.currentTheme = 'light';
      this.applyTheme();
    }
  }

  /**
   * Apply theme to the document
   */
  private applyTheme(): void {
    const htmlElement = document.documentElement;
    if (this.currentTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }

  /**
   * Validate Quick AI settings
   */
  private async validateSettings(): Promise<void> {
    try {
      const validation = await this.api.validateSettings();
      this.settingsValid = validation.valid;
      this.settingsError = validation.error || '';
    } catch (error) {
      this.settingsValid = false;
      this.settingsError = error instanceof Error ? error.message : 'Failed to validate settings';
    }
  }

  /**
   * Set up listener for window shown event
   * Reloads theme and settings when window is shown after being hidden
   */
  private setupWindowShownListener(): void {
    this.unsubscribeWindowShown = this.api.onWindowShown(async () => {
      // Reload theme and settings when window is shown
      await this.loadTheme();
      await this.validateSettings();
      // Re-render to show updated validation state
      this.render();
      // Re-attach event listeners after re-render
      this.attachEventListeners();
      // Re-attach conversation listeners (awaits getting the agent)
      await this.attachConversationListeners();
    });
  }

  /**
   * Attach conversation listeners to the conversation panel
   * Follows the same pattern as chat-panel.ts
   */
  private async attachConversationListeners(): Promise<void> {
    const conversation = this.querySelector('#conversation-panel') as any;
    if (!conversation) return;

    // Get or create the Quick AI agent
    const agent = await this.api.getAgent();

    // Set the agent on the conversation panel (needed for streaming)
    // We use a dummy project since Quick AI doesn't have a project
    const dummyProject = { path: '', name: 'Quick AI', addedAt: Date.now() };
    conversation.setAgent(agent, dummyProject);

    // Create and inject the user message factory
    const createUserMessage = (content: string): HTMLElement => {
      return UserMessage.create(content);
    };
    conversation.setUserMessageFactory(createUserMessage);

    // Create and inject the assistant message factory
    const createAssistantMessage = (content: string, reasoning: string): HTMLElement => {
      return AssistantMessage.createWithHandlers(
        content,
        reasoning,
        // No save handler needed for Quick AI (copy uses default behavior)
        null
      );
    };
    conversation.setAssistantMessageFactory(createAssistantMessage);

    // Listen for message-sent events from conversation-panel
    conversation.addEventListener('message-sent', async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message } = customEvent.detail;

      try {
        await this.handleStreamMessage(message, conversation);
      } catch (error: any) {
        conversation.handleStreamError(`Failed to send message: ${error.message}`);
      }
    });
  }

  /**
   * Handle streaming message via Quick AI IPC
   * Follows the same pattern as chat-panel.ts
   */
  private async handleStreamMessage(message: string, conversation: any): Promise<void> {
    // Call Quick AI stream IPC channel
    await this.api.streamMessage(
      message,
      // onChunk - delegate to conversation-panel
      (chunk: string) => conversation.handleStreamChunk(chunk),
      // onReasoning - delegate to conversation-panel
      (reasoning: string) => conversation.handleStreamReasoning(reasoning),
      // onComplete - delegate to conversation-panel
      (content: string) => {
        conversation.handleStreamComplete(content);
      },
      // onError - delegate to conversation-panel
      (error: string) => conversation.handleStreamError(error)
    );
  }

  /**
   * Handle clear chat button
   */
  private async handleClearChat(): Promise<void> {
    const conversation = this.querySelector('#conversation-panel') as any;
    if (!conversation) return;

    try {
      await this.api.clearHistory();
      conversation.clearChat();
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  }

  /**
   * Open settings dialog
   */
  private openSettings(): void {
    // Send IPC message to main window to open settings
    // For now, we'll just show an alert
    alert('Please open the main application window and go to Settings to configure the default provider and model for Quick AI.');
  }

  private render(): void {
    const errorBanner = this.settingsValid ? '' : `
      <div class="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm text-red-800 dark:text-red-200 font-medium">Quick AI Not Configured</p>
            <p class="text-xs text-red-600 dark:text-red-300 mt-1">${this.escapeHtml(this.settingsError)}</p>
          </div>
          <button
            id="open-settings-btn"
            class="ml-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded cursor-pointer border-0"
          >
            Open Settings
          </button>
        </div>
      </div>
    `;

    const clearButtonDisabled = this.isStreaming ? 'disabled' : '';
    const clearButtonOpacity = this.isStreaming ? 'opacity-50 cursor-not-allowed' : '';

    this.innerHTML = `
      <div class="flex-1 bg-white dark:bg-gray-900 flex flex-col h-full min-h-0">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-200 m-0">Quick AI</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-0">Press Option+Q to toggle window</p>
          </div>
          <button
            id="clear-chat-btn"
            ${clearButtonDisabled}
            class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer border-0 ${clearButtonOpacity}"
          >
            Clear Chat
          </button>
        </div>

        <!-- Error Banner (if settings not configured) -->
        ${errorBanner}

        <!-- Conversation Panel -->
        <conversation-panel
          id="conversation-panel"
          placeholder="${this.settingsValid ? 'Type a message...' : 'Please configure Quick AI settings first...'}"
          ${!this.settingsValid ? 'disabled' : ''}
        ></conversation-panel>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Clear chat button
    const clearBtn = this.querySelector('#clear-chat-btn');
    if (clearBtn) {
      const newBtn = clearBtn.cloneNode(true);
      clearBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.handleClearChat());
    }

    // Open settings button (only present if settings not configured)
    const settingsBtn = this.querySelector('#open-settings-btn');
    if (settingsBtn) {
      const newBtn = settingsBtn.cloneNode(true);
      settingsBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openSettings());
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('quick-ai-window', QuickAIWindow);
