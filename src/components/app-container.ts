import './project-detail-panel';

/**
 * AppContainer Web Component
 * Main application container that manages layout and sidebar toggles using Tailwind CSS
 */
export class AppContainer extends HTMLElement {
  private projectPanel: any = null;
  private dashboard: any = null;
  private chatPanel: any = null;
  private projectDetailPanel: any = null;
  private projectToggleBtn: HTMLElement | null = null;
  private projectDetailToggleBtn: HTMLElement | null = null;
  private showingChat: boolean = false;

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

        <!-- Center area: either dashboard or chat-panel -->
        <project-agent-dashboard id="project-agent-dashboard" class="flex-1 transition-all duration-300 ease-in-out ${this.showingChat ? 'hidden' : ''}"></project-agent-dashboard>
        <chat-panel id="chat-panel" class="flex-1 transition-all duration-300 ease-in-out ${!this.showingChat ? 'hidden' : ''}"></chat-panel>

        <!-- Toggle button for right panel -->
        <button id="toggle-project-detail-btn" class="hidden flex-col items-center justify-center w-8 bg-gray-50 border-l border-gray-200 hover:bg-gray-100 cursor-pointer border-0" aria-label="Expand project detail panel">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <!-- Right panel: Project Detail -->
        <project-detail-panel id="project-detail-panel"></project-detail-panel>
      </div>
    `;

    // Get panel references
    this.projectPanel = this.querySelector('#project-panel');
    this.dashboard = this.querySelector('#project-agent-dashboard');
    this.chatPanel = this.querySelector('#chat-panel');
    this.projectDetailPanel = this.querySelector('#project-detail-panel');

    // Re-attach event listeners after re-rendering
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.projectToggleBtn = this.querySelector('#toggle-project-btn');

    if (this.projectToggleBtn) {
      const newBtn = this.projectToggleBtn.cloneNode(true);
      this.projectToggleBtn.replaceWith(newBtn);
      this.projectToggleBtn = newBtn as HTMLElement;
      this.projectToggleBtn.addEventListener('click', () => this.toggleProjectPanel());
    }

    this.projectDetailToggleBtn = this.querySelector('#toggle-project-detail-btn');

    if (this.projectDetailToggleBtn) {
      const newBtn = this.projectDetailToggleBtn.cloneNode(true);
      this.projectDetailToggleBtn.replaceWith(newBtn);
      this.projectDetailToggleBtn = newBtn as HTMLElement;
      this.projectDetailToggleBtn.addEventListener('click', () => this.toggleProjectDetailPanel());
    }

    // Listen for panel toggle events from child components
    this.addEventListener('panel-toggle', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { panel, collapsed } = customEvent.detail;
      this.handlePanelToggle(panel, collapsed);
    });

    // Listen for project-selected events and forward to project-agent-dashboard and project-detail-panel
    this.addEventListener('project-selected', (event: Event) => {
      const customEvent = event as CustomEvent;

      // Forward to dashboard
      const dashboard = this.querySelector('#project-agent-dashboard');
      if (dashboard) {
        // Re-emit the event to project-agent-dashboard (don't bubble to prevent infinite loop)
        dashboard.dispatchEvent(new CustomEvent('project-selected', {
          detail: customEvent.detail,
          bubbles: false,
          composed: true
        }));
      }

      // Forward to project-detail-panel
      const projectDetailPanel = this.querySelector('#project-detail-panel');
      if (projectDetailPanel) {
        projectDetailPanel.dispatchEvent(new CustomEvent('project-selected', {
          detail: customEvent.detail,
          bubbles: false,
          composed: true
        }));
      }

      // If currently showing chat, switch back to dashboard view
      if (this.showingChat) {
        this.showDashboard();
      }
    });

    // Listen for agent-selected events - show chat panel
    this.addEventListener('agent-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.showChatPanel();
      // Forward to chat-panel
      if (this.chatPanel) {
        this.chatPanel.dispatchEvent(new CustomEvent('agent-selected', {
          detail: customEvent.detail,
          bubbles: false,
          composed: true
        }));
      }
    });

    // Listen for chat-back events - show dashboard again
    this.addEventListener('chat-back', () => {
      this.showDashboard();
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
    }

    if (panel === 'right' && this.projectDetailToggleBtn) {
      if (collapsed) {
        this.projectDetailToggleBtn.classList.remove('hidden');
        this.projectDetailToggleBtn.classList.add('flex');
      } else {
        this.projectDetailToggleBtn.classList.add('hidden');
        this.projectDetailToggleBtn.classList.remove('flex');
      }
    }
  }

  private toggleProjectPanel(): void {
    if (this.projectPanel) {
      this.projectPanel.expand();
    }
  }

  private toggleProjectDetailPanel(): void {
    if (this.projectDetailPanel) {
      this.projectDetailPanel.expand();
    }
  }

  private showChatPanel(): void {
    this.showingChat = true;
    // Toggle visibility instead of re-rendering to preserve component state
    if (this.dashboard) {
      this.dashboard.classList.add('hidden');
    }
    if (this.chatPanel) {
      this.chatPanel.classList.remove('hidden');
    }
  }

  private showDashboard(): void {
    this.showingChat = false;
    // Toggle visibility instead of re-rendering to preserve component state
    if (this.chatPanel) {
      this.chatPanel.classList.add('hidden');
    }
    if (this.dashboard) {
      this.dashboard.classList.remove('hidden');
    }
  }
}

// Register the custom element
customElements.define('app-container', AppContainer);
