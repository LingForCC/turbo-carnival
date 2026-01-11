/**
 * MiddlePanel Web Component
 * A center content area with multiline textarea using Tailwind CSS
 */
export class MiddlePanel extends HTMLElement {
  private textarea: HTMLTextAreaElement | null = null;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex-1 bg-white h-full flex flex-col">
        <div class="flex-1 p-6 flex flex-col">
          <textarea
            id="main-textarea"
            class="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
            placeholder="Enter your text here..."
            rows="10"
          ></textarea>
        </div>
      </div>
    `;

    // Re-attach event listeners after re-rendering
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.textarea = this.querySelector('#main-textarea') as HTMLTextAreaElement;

    if (this.textarea) {
      // Remove any existing listeners to avoid duplicates
      const newTextarea = this.textarea.cloneNode(true) as HTMLTextAreaElement;
      this.textarea.replaceWith(newTextarea);
      this.textarea = newTextarea;

      // Listen for input changes
      this.textarea.addEventListener('input', (event) => {
        const target = event.target as HTMLTextAreaElement;
        this.dispatchEvent(new CustomEvent('text-change', {
          detail: { value: target.value },
          bubbles: true,
        }));
      });
    }
  }

  /**
   * Get the current text value
   */
  public getValue(): string {
    return this.textarea?.value || '';
  }

  /**
   * Set the text value
   */
  public setValue(value: string): void {
    if (this.textarea) {
      this.textarea.value = value;
    }
  }

  /**
   * Clear the text
   */
  public clear(): void {
    if (this.textarea) {
      this.textarea.value = '';
    }
  }

  /**
   * Focus the textarea
   */
  public focus(): void {
    this.textarea?.focus();
  }
}

// Register the custom element
customElements.define('middle-panel', MiddlePanel);
