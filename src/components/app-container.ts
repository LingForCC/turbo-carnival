import './project-detail-panel';
import './tools-dialog';
import './tool-test-dialog';
import './provider-dialog';
import './model-config-dialog';
import './app-panel';

/**
 * AppContainer Web Component
 * Main application container that manages layout and sidebar toggles using Tailwind CSS
 */
export class AppContainer extends HTMLElement {
  private projectPanel: any = null;
  private dashboard: any = null;
  private chatPanel: any = null;
  private appPanel: any = null;
  private projectDetailPanel: any = null;
  private projectToggleBtn: HTMLElement | null = null;
  private projectDetailToggleBtn: HTMLElement | null = null;
  private showingChat: boolean = false;
  private isAppAgent: boolean = false;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    // Add flex column layout to the app-container
    this.className = 'flex flex-col h-full w-full overflow-hidden';
    // Load theme preference on mount
    await this.loadTheme();
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Header -->
      <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-200 m-0">Turbo Carnival</h1>
        <div class="flex items-center gap-2">
          <!-- Theme Toggle Button -->
          <button id="theme-toggle-btn" class="flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent" title="Toggle theme">
            ${this.getThemeIcon()}
          </button>
          <button id="tools-btn" class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tools</span>
          </button>
          <button id="models-btn" class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Models</span>
          </button>
          <button id="providers-btn" class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Providers</span>
          </button>
        </div>
      </header>

      <div class="flex flex-1 w-full bg-gray-100 dark:bg-gray-950 overflow-hidden">
        <project-panel id="project-panel"></project-panel>

        <button id="toggle-project-btn" class="hidden flex-col items-center justify-center w-8 bg-gray-50 border-r border-gray-200 hover:bg-gray-100 cursor-pointer border-0" aria-label="Expand project panel">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Center area: either dashboard or chat-panel or app-panel -->
        <project-agent-dashboard id="project-agent-dashboard" class="flex-1 transition-all duration-300 ease-in-out ${this.showingChat ? 'hidden' : ''}"></project-agent-dashboard>
        <chat-panel id="chat-panel" class="flex-1 transition-all duration-300 ease-in-out ${!this.showingChat || this.isAppAgent ? 'hidden' : ''}"></chat-panel>
        <app-panel id="app-panel" class="flex-1 transition-all duration-300 ease-in-out ${!this.showingChat || !this.isAppAgent ? 'hidden' : ''}"></app-panel>

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
    this.appPanel = this.querySelector('#app-panel');
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

    // Tools button
    const toolsBtn = this.querySelector('#tools-btn');
    if (toolsBtn) {
      const newBtn = toolsBtn.cloneNode(true);
      toolsBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openToolsDialog());
    }

    // Models button
    const modelsBtn = this.querySelector('#models-btn');
    if (modelsBtn) {
      const newBtn = modelsBtn.cloneNode(true);
      modelsBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openModelsDialog());
    }

    // Providers button
    const providersBtn = this.querySelector('#providers-btn');
    if (providersBtn) {
      const newBtn = providersBtn.cloneNode(true);
      providersBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openProvidersDialog());
    }

    // Theme toggle button
    const themeToggleBtn = this.querySelector('#theme-toggle-btn');
    if (themeToggleBtn) {
      const newBtn = themeToggleBtn.cloneNode(true);
      themeToggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.toggleTheme());
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
      const agent = customEvent.detail.agent;

      // Check if this is an App-type agent
      const isAppAgent = agent.type === 'app';
      this.isAppAgent = isAppAgent;

      this.showChatPanel();

      // Forward to appropriate panel
      if (isAppAgent && this.appPanel) {
        this.appPanel.dispatchEvent(new CustomEvent('agent-selected', {
          detail: customEvent.detail,
          bubbles: false,
          composed: true
        }));
      } else if (this.chatPanel) {
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

    // Show appropriate panel based on agent type
    if (this.isAppAgent) {
      if (this.chatPanel) {
        this.chatPanel.classList.add('hidden');
      }
      if (this.appPanel) {
        this.appPanel.classList.remove('hidden');
      }
    } else {
      if (this.appPanel) {
        this.appPanel.classList.add('hidden');
      }
      if (this.chatPanel) {
        this.chatPanel.classList.remove('hidden');
      }
    }
  }

  private showDashboard(): void {
    this.showingChat = false;
    this.isAppAgent = false;
    // Toggle visibility instead of re-rendering to preserve component state
    if (this.chatPanel) {
      this.chatPanel.classList.add('hidden');
    }
    if (this.appPanel) {
      this.appPanel.classList.add('hidden');
    }
    if (this.dashboard) {
      this.dashboard.classList.remove('hidden');
    }
  }

  private async loadTheme(): Promise<void> {
    if (window.electronAPI) {
      try {
        const settings = await window.electronAPI.getSettings();
        this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
        this.applyTheme();
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    }
  }

  private async toggleTheme(): Promise<void> {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';

    // Update the theme state and apply it immediately
    this.currentTheme = newTheme;
    this.applyTheme();

    // Update the theme toggle button icon immediately
    const themeToggleBtn = this.querySelector('#theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = this.getThemeIcon();
    }

    // Save the preference asynchronously
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateSettings({ theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme:', error);
        // Revert the change if it failed to save
        this.currentTheme = newTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        if (themeToggleBtn) {
          themeToggleBtn.innerHTML = this.getThemeIcon();
        }
      }
    }
  }

  private applyTheme(): void {
    const htmlElement = document.documentElement;

    if (this.currentTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

  }

  private getThemeIcon(): string {
    return this.currentTheme === 'light'
      ? `<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>`
      : `<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>`;
  }

  private openToolsDialog(): void {
    const dialog = document.createElement('tools-dialog');
    document.body.appendChild(dialog);

    dialog.addEventListener('tools-dialog-close', () => {
      dialog.remove();
    });
  }

  private openModelsDialog(): void {
    const dialog = document.createElement('model-config-dialog');
    document.body.appendChild(dialog);

    dialog.addEventListener('model-config-dialog-close', () => {
      dialog.remove();
    });
  }

  private openProvidersDialog(): void {
    const dialog = document.createElement('provider-dialog');
    document.body.appendChild(dialog);

    dialog.addEventListener('provider-dialog-close', () => {
      dialog.remove();
    });
  }
}

// Register the custom element
customElements.define('app-container', AppContainer);
