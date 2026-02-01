import { escapeHtml, renderMarkdown, renderReasoningSection } from './utils';

/**
 * AppCodeMessage Web Component
 * Renders an assistant message for app agents with:
 * - App code callouts for HTML code blocks
 * - Markdown rendering for remaining content
 * - Optional reasoning content
 * Supports parent-provided handler for save action
 * Copy action uses default clipboard behavior
 */

export type SaveHandler = (content: string) => Promise<void>;
export type ViewAppHandler = () => void;

export class AppCodeMessage extends HTMLElement {
  private content: string = '';
  private reasoning: string = '';
  private saveHandler: SaveHandler | null = null;
  private viewAppHandler: ViewAppHandler | null = null;
  private htmlCodeBlocks: string[] = [];

  static get observedAttributes(): string[] {
    return ['content', 'reasoning'];
  }

  connectedCallback(): void {
    this.parseAttributes();
    this.extractHtmlCodeBlocks();
    this.render();
    this.attachEventListeners();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.parseAttributes();
      this.extractHtmlCodeBlocks();
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
   * Set the view app handler from parent component
   */
  public setViewAppHandler(handler: ViewAppHandler): void {
    this.viewAppHandler = handler;
  }

  /**
   * Factory method to create an AppCodeMessage with handler already attached.
   * This allows parent components to provide a factory function that closes over
   * their specific handler implementation.
   */
  static createWithHandlers(
    content: string,
    reasoning: string,
    saveHandler: SaveHandler,
    viewAppHandler: ViewAppHandler
  ): AppCodeMessage {
    const element = document.createElement('app-code-message') as AppCodeMessage;
    element.setAttribute('content', content);
    if (reasoning) {
      element.setAttribute('reasoning', reasoning);
    }
    element.setSaveHandler(saveHandler);
    element.setViewAppHandler(viewAppHandler);
    return element;
  }

  private parseAttributes(): void {
    this.content = this.getAttribute('content') || '';
    this.reasoning = this.getAttribute('reasoning') || '';
  }

  private extractHtmlCodeBlocks(): void {
    // Extract all HTML code blocks using regex
    const htmlCodeRegex = /```html\n([\s\S]*?)\n```/g;
    this.htmlCodeBlocks = [];
    let match: RegExpExecArray | null;

    while ((match = htmlCodeRegex.exec(this.content)) !== null) {
      this.htmlCodeBlocks.push(match[1]);
    }
  }

  private getMainContent(): string {
    // Remove HTML code blocks from the main content
    const htmlCodeRegex = /```html\n([\s\S]*?)\n```/g;
    return this.content.replace(htmlCodeRegex, '').trim();
  }

  private renderAppCodeCallout(htmlCode: string, index: number): string {
    // Use similar styling to tool call message - blue/indigo theme for app code
    const bgColor = 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700';

    return `
      <div class="my-2 max-w-[85%] w-[85%]">
        <div class="rounded-lg border ${bgColor} px-4 py-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-1">
              App Code${index > 0 ? ` ${index + 1}` : ''}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
            <span class="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">HTML Application</span>
            <button
              class="view-app-btn hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 cursor-pointer border-0 bg-transparent flex-shrink-0"
              title="View App"
            >
              <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    // Build reasoning section (before content)
    const reasoningSection = this.reasoning ? renderReasoningSection(this.reasoning) : '';

    // Build app code callouts (if any HTML blocks were found)
    const appCodeCallouts = this.htmlCodeBlocks
      .map((code, index) => this.renderAppCodeCallout(code, index))
      .join('');

    // Get main content without HTML blocks
    const mainContent = this.getMainContent();

    // Apply markdown parsing to main content
    const renderedContent = mainContent ? renderMarkdown(mainContent) : '';

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
          ${appCodeCallouts}
          ${renderedContent ? `<div class="text-sm prose prose-sm max-w-none break-words">${renderedContent}</div>` : ''}
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

    // View app buttons
    const viewAppBtns = this.querySelectorAll('.view-app-btn');
    viewAppBtns.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.viewAppHandler) {
          this.viewAppHandler();
        }
      });
    });

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
          console.warn('No save handler provided to app-code-message component');
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
customElements.define('app-code-message', AppCodeMessage);
