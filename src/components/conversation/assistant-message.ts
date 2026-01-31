import { escapeHtml, renderMarkdown } from './utils';

/**
 * AssistantMessage Web Component
 * Renders an assistant message with optional reasoning content
 * Supports parent-provided handler for save action
 * Copy action uses default clipboard behavior
 */

export type SaveHandler = (content: string) => Promise<void>;

export class AssistantMessage extends HTMLElement {
  private content: string = '';
  private reasoning: string = '';
  private saveHandler: SaveHandler | null = null;

  static get observedAttributes(): string[] {
    return ['content', 'reasoning'];
  }

  connectedCallback(): void {
    this.parseAttributes();
    this.render();
    this.attachEventListeners();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.parseAttributes();
      this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Set the save handler from parent component
   */
  public setSaveHandler(handler: SaveHandler): void {
    this.saveHandler = handler;
  }

  /**
   * Factory method to create an AssistantMessage with handler already attached.
   * This allows parent components to provide a factory function that closes over
   * their specific handler implementation.
   */
  static createWithHandlers(
    content: string,
    reasoning: string,
    saveHandler: SaveHandler
  ): AssistantMessage {
    const element = document.createElement('assistant-message') as AssistantMessage;
    element.setAttribute('content', content);
    if (reasoning) {
      element.setAttribute('reasoning', reasoning);
    }
    element.setSaveHandler(saveHandler);
    return element;
  }

  private parseAttributes(): void {
    this.content = this.getAttribute('content') || '';
    this.reasoning = this.getAttribute('reasoning') || '';
  }

  /**
   * Render reasoning/thinking section
   */
  private renderReasoningSection(): string {
    if (!this.reasoning) return '';

    return `
      <div class="mb-3">
        <button
          class="reasoning-toggle-btn flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 cursor-pointer border-0 bg-transparent p-0"
        >
          <svg class="w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          <span>Thinking Process</span>
        </button>
        <div class="reasoning-content hidden mt-2 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md">
          <div class="text-sm text-gray-700 prose prose-sm max-w-none">
            ${renderMarkdown(this.reasoning)}
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    // Build reasoning section (before content)
    const reasoningSection = this.renderReasoningSection();

    // Apply markdown parsing
    const renderedContent = renderMarkdown(this.content);

    // Action buttons (save and copy)
    const actionButtons = `
      <div class="flex justify-end gap-2 mt-2">
        <button
          class="save-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
          title="Save to file"
        >
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
        </button>
        <button
          class="copy-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
          title="Copy message"
        >
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>
    `;

    this.innerHTML = `
      <div class="flex justify-start group relative">
        <div class="max-w-[85%] rounded-lg px-4 py-2 text-gray-800 dark:text-white">
          ${reasoningSection}
          <div class="text-sm prose prose-sm max-w-none break-words">${renderedContent}</div>
          ${actionButtons}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Reasoning toggle button
    const reasoningToggleBtn = this.querySelector('.reasoning-toggle-btn');
    if (reasoningToggleBtn) {
      const newBtn = reasoningToggleBtn.cloneNode(true);
      reasoningToggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;
        const icon = button.querySelector('svg');
        const details = button.nextElementSibling as HTMLElement;

        if (details) {
          details.classList.toggle('hidden');
          if (icon) {
            icon.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
          }
        }
      });
    }

    // Save message button
    const saveBtn = this.querySelector('.save-msg-btn');
    if (saveBtn) {
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;

        if (this.saveHandler) {
          try {
            await this.saveHandler(this.content);

            // Show success feedback
            const originalHTML = button.innerHTML;
            button.classList.add('text-green-500');
            setTimeout(() => {
              button.classList.remove('text-green-500');
              button.innerHTML = originalHTML;
            }, 2000);
          } catch (error: any) {
            console.error('Failed to save message:', error);
            alert(`Failed to save file: ${error.message}`);
          }
        } else {
          console.warn('No save handler provided to assistant-message component');
        }
      });
    }

    // Copy message button
    const copyBtn = this.querySelector('.copy-msg-btn');
    if (copyBtn) {
      const newBtn = copyBtn.cloneNode(true);
      copyBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', async (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;

        // Use default clipboard behavior
        try {
          await navigator.clipboard.writeText(this.content);

          // Show success feedback
          const originalHTML = button.innerHTML;
          button.innerHTML = `
            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          `;

          // Reset after 2 seconds
          setTimeout(() => {
            button.innerHTML = originalHTML;
          }, 2000);
        } catch (error) {
          console.error('Failed to copy text:', error);
        }
      });
    }
  }
}

// Register the custom element
customElements.define('assistant-message', AssistantMessage);
