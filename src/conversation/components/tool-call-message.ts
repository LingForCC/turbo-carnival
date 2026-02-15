import { escapeHtml, renderMarkdown, renderReasoningSection } from './utils';
import type { ToolCallData } from './conversation-panel';

/**
 * ToolCallMessage Web Component
 * Renders a tool call message with status, parameters, result, and optional reasoning content
 * Uses clone-and-replace pattern for event listeners to prevent duplicates
 */

export class ToolCallMessage extends HTMLElement {
  private content: string = '';
  private reasoning: string = '';
  private toolCall: ToolCallData;

  static get observedAttributes(): string[] {
    return ['content', 'reasoning', 'tool-call-data'];
  }

  constructor(toolCall: ToolCallData) {
    super();
    this.toolCall = toolCall;
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
   * Factory method to create a ToolCallMessage with data already attached.
   * This allows parent components to provide a factory function that closes over
   * their specific tool call data.
   */
  static createWithHandlers(
    content: string,
    toolCall: ToolCallData,
    reasoning?: string
  ): ToolCallMessage {
    const element = document.createElement('tool-call-message') as ToolCallMessage;
    element.setAttribute('content', content);
    element.setAttribute('tool-call-data', JSON.stringify(toolCall));
    if (reasoning) {
      element.setAttribute('reasoning', reasoning);
    }
    return element;
  }

  private parseAttributes(): void {
    this.content = this.getAttribute('content') || '';
    this.reasoning = this.getAttribute('reasoning') || '';

    const toolCallDataAttr = this.getAttribute('tool-call-data');
    if (toolCallDataAttr) {
      try {
        this.toolCall = JSON.parse(toolCallDataAttr) as ToolCallData;
      } catch (error) {
        console.error('Failed to parse tool-call-data attribute:', error);
        this.toolCall = {
          toolName: 'Unknown',
          parameters: {},
          status: 'failed'
        };
      }
    }
  }

  private render(): void {
    const isExecuting = this.toolCall.status === 'executing';
    const isFailed = this.toolCall.status === 'failed';
    const isCompleted = this.toolCall.status === 'completed';

    // Background color based on status
    const bgColor = isExecuting
      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
      : (isFailed ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700');

    // Build reasoning section if present (appears before tool call)
    const reasoningSection = this.reasoning ? renderReasoningSection(this.reasoning) : '';

    // Status icon (hidden during execution)
    const statusIcon = isExecuting
      ? ''
      : isCompleted
        ? `<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
           </svg>`
        : `<svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
           </svg>`;

    // Status text (hidden during execution)
    const statusText = isExecuting
      ? ''
      : isCompleted
        ? 'Completed'
        : 'Failed';

    this.innerHTML = `
      <div class="flex justify-start my-2">
        <div class="max-w-[85%] w-[85%] rounded-lg border ${bgColor} px-4 py-3">
          ${reasoningSection}
          <div class="flex items-center gap-2">
            ${statusIcon}
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate ${isExecuting ? 'flex-1' : ''}">
              ${escapeHtml(this.toolCall.toolName)}
            </span>
            ${!isExecuting ? `
              <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
              <span class="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">${statusText}</span>
            ` : ''}
            <button
              class="tool-call-toggle-btn hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 cursor-pointer border-0 bg-transparent flex-shrink-0"
            >
              <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div class="tool-call-details hidden mt-3">
            ${this.toolCall.parameters && Object.keys(this.toolCall.parameters).length > 0 ? `
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <div class="font-semibold mb-1">Parameters:</div>
                <div class="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all">${escapeHtml(JSON.stringify(this.toolCall.parameters, null, 2))}</pre>
                </div>
              </div>
            ` : ''}

            ${isCompleted && this.toolCall.result ? `
              <div>
                <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Result:</div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all">${escapeHtml(JSON.stringify(this.toolCall.result, null, 2))}</pre>
                </div>
                ${this.toolCall.executionTime ? `
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Execution time: ${this.toolCall.executionTime}ms</div>
                ` : ''}
              </div>
            ` : ''}

            ${isFailed && this.toolCall.error ? `
              <div>
                <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Error:</div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <pre class="text-xs m-0 whitespace-pre-wrap break-all text-red-700 dark:text-red-400">${escapeHtml(this.toolCall.error)}</pre>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Tool call toggle button
    const toggleBtn = this.querySelector('.tool-call-toggle-btn');
    if (toggleBtn) {
      const newBtn = toggleBtn.cloneNode(true);
      toggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLElement;
        const icon = button.querySelector('svg');
        const details = button.parentElement?.nextElementSibling as HTMLElement;

        if (details) {
          details.classList.toggle('hidden');
          if (icon) {
            icon.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
          }
        }
      });
    }

    // Reasoning toggle button (if present)
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
  }
}

// Register the custom element
customElements.define('tool-call-message', ToolCallMessage);
