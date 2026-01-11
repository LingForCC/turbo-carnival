/**
 * RightPanel Web Component
 * A collapsible right sidebar panel using Tailwind CSS
 */
export class RightPanel extends HTMLElement {
  private container: HTMLElement | null = null;
  private isCollapsed: boolean = false;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    const widthClass = this.isCollapsed ? 'w-0' : 'w-64';
    const overflowClass = this.isCollapsed ? 'overflow-hidden' : 'overflow-visible';

    this.innerHTML = `
      <div class="${widthClass} ${overflowClass} bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800 m-0">Right Panel</h2>
          <button id="toggle-btn" class="p-1 hover:bg-gray-100 rounded flex items-center justify-center bg-transparent border-0 cursor-pointer" aria-label="Toggle right panel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <p class="text-gray-600 m-0">This is the right sidebar content.</p>
        </div>
      </div>
    `;

    this.container = this.querySelector('div');
    // Re-attach event listeners after re-rendering
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const toggleBtn = this.querySelector('#toggle-btn');
    if (toggleBtn) {
      // Remove any existing listeners to avoid duplicates
      const newBtn = toggleBtn.cloneNode(true);
      toggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.toggle());
    }
  }

  private toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.render();

    // Dispatch custom event for parent components
    this.dispatchEvent(new CustomEvent('panel-toggle', {
      detail: { panel: 'right', collapsed: this.isCollapsed },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Public method to collapse the panel
   */
  public collapse(): void {
    if (!this.isCollapsed) {
      this.toggle();
    }
  }

  /**
   * Public method to expand the panel
   */
  public expand(): void {
    if (this.isCollapsed) {
      this.toggle();
    }
  }

  /**
   * Check if the panel is collapsed
   */
  public getCollapsed(): boolean {
    return this.isCollapsed;
  }
}

// Register the custom element
customElements.define('right-panel', RightPanel);
