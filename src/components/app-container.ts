/**
 * AppContainer Web Component
 * Main application container that manages layout and sidebar toggles using Tailwind CSS
 */
export class AppContainer extends HTMLElement {
  private projectPanel: any = null;
  private rightPanel: any = null;
  private projectToggleBtn: HTMLElement | null = null;
  private rightToggleBtn: HTMLElement | null = null;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex h-full w-full bg-gray-100">
        <project-panel id="project-panel"></project-panel>

        <button id="toggle-project-btn" class="hidden flex-col items-center justify-center w-8 bg-gray-50 border-r border-gray-200 hover:bg-gray-100 cursor-pointer border-0" aria-label="Expand project panel">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <middle-panel id="middle-panel" class="flex-1 transition-all duration-300 ease-in-out"></middle-panel>

        <button id="toggle-right-btn" class="hidden flex-col items-center justify-center w-8 bg-gray-50 border-l border-gray-200 hover:bg-gray-100 cursor-pointer border-0" aria-label="Expand right panel">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <right-panel id="right-panel"></right-panel>
      </div>
    `;

    // Get panel references
    this.projectPanel = this.querySelector('#project-panel');
    this.rightPanel = this.querySelector('#right-panel');

    // Re-attach event listeners after re-rendering
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.projectToggleBtn = this.querySelector('#toggle-project-btn');
    this.rightToggleBtn = this.querySelector('#toggle-right-btn');

    if (this.projectToggleBtn) {
      const newBtn = this.projectToggleBtn.cloneNode(true);
      this.projectToggleBtn.replaceWith(newBtn);
      this.projectToggleBtn = newBtn as HTMLElement;
      this.projectToggleBtn.addEventListener('click', () => this.toggleProjectPanel());
    }

    if (this.rightToggleBtn) {
      const newBtn = this.rightToggleBtn.cloneNode(true);
      this.rightToggleBtn.replaceWith(newBtn);
      this.rightToggleBtn = newBtn as HTMLElement;
      this.rightToggleBtn.addEventListener('click', () => this.toggleRightPanel());
    }

    // Listen for panel toggle events from child components
    this.addEventListener('panel-toggle', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { panel, collapsed } = customEvent.detail;
      this.handlePanelToggle(panel, collapsed);
    });
  }

  private handlePanelToggle(panel: string, collapsed: boolean): void {
    if (panel === 'left' && this.projectToggleBtn) {
      if (collapsed) {
        this.projectToggleBtn.classList.remove('hidden');
        this.projectToggleBtn.classList.add('flex');
      } else {
        this.projectToggleBtn.classList.add('hidden');
        this.projectToggleBtn.classList.remove('flex');
      }
    } else if (panel === 'right' && this.rightToggleBtn) {
      if (collapsed) {
        this.rightToggleBtn.classList.remove('hidden');
        this.rightToggleBtn.classList.add('flex');
      } else {
        this.rightToggleBtn.classList.add('hidden');
        this.rightToggleBtn.classList.remove('flex');
      }
    }
  }

  private toggleProjectPanel(): void {
    if (this.projectPanel) {
      this.projectPanel.expand();
    }
  }

  private toggleRightPanel(): void {
    if (this.rightPanel) {
      this.rightPanel.expand();
    }
  }
}

// Register the custom element
customElements.define('app-container', AppContainer);
