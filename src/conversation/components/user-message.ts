import { escapeHtml } from './utils';

/**
 * UserMessage Web Component
 * Renders a user message with plain text content
 * Positioned on the right side with blue background
 */
export class UserMessage extends HTMLElement {
  private content: string = '';

  static get observedAttributes(): string[] {
    return ['content'];
  }

  connectedCallback(): void {
    this.parseAttributes();
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.parseAttributes();
      this.render();
    }
  }

  /**
   * Factory method to create a UserMessage
   */
  static create(content: string): UserMessage {
    const element = document.createElement('user-message') as UserMessage;
    element.setAttribute('content', content);
    return element;
  }

  private parseAttributes(): void {
    this.content = this.getAttribute('content') || '';
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex justify-end">
        <div class="max-w-[85%] rounded-lg px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white">
          <div class="text-sm whitespace-pre-wrap break-words">${escapeHtml(this.content)}</div>
        </div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('user-message', UserMessage);
