import { getProjectManagementAPI } from '../../project/api';
import type { Project, ProjectManagementAPI } from '../../project/types';

/**
 * QuickProjectAccess - Quick project search popup component
 *
 * Features:
 * - Search projects by name
 * - Keyboard navigation (arrow keys)
 * - Enter to select, Escape to close
 * - Dispatches 'project-selected' event when project is chosen
 * - Dispatches 'quick-project-access-close' when closing
 */
export class QuickProjectAccess extends HTMLElement {
  private api: ProjectManagementAPI;
  private projects: Project[] = [];
  private selectedIndex: number = 0;
  private searchQuery: string = '';
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super();
    this.api = getProjectManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    await this.loadProjects();
    this.render();
    this.attachEventListeners();
    this.attachKeyboardHandler();

    // Focus search input after render
    requestAnimationFrame(() => {
      const searchInput = this.querySelector('#search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  disconnectedCallback(): void {
    // Clean up keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  /**
   * Load projects from API
   */
  private async loadProjects(): Promise<void> {
    try {
      this.projects = await this.api.getProjects();
      this.selectedIndex = 0;
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projects = [];
    }
  }

  /**
   * Get filtered projects based on search query
   */
  private get filteredProjects(): Project[] {
    if (!this.searchQuery.trim()) {
      return this.projects;
    }
    const query = this.searchQuery.toLowerCase();
    return this.projects.filter(project =>
      project.name.toLowerCase().includes(query)
    );
  }

  /**
   * Render the quick project access popup
   */
  private render(): void {
    const displayProjects = this.filteredProjects;
    const hasNoResults = this.projects.length > 0 && displayProjects.length === 0 && this.searchQuery.trim() !== '';

    this.innerHTML = `
      <!-- Backdrop overlay -->
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="backdrop">
        <!-- Dialog container with fixed height -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[480px] h-[400px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
          <!-- Search Input (fixed at top) -->
          <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Search projects..."
                value="${this.escapeHtml(this.searchQuery)}"
                class="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
              <!-- Search icon -->
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>

          <!-- Project List (scrollable) -->
          <div id="project-list" class="flex-1 overflow-y-auto">
            ${this.projects.length === 0
              ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No projects available</div>'
              : hasNoResults
              ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No projects found</div>'
              : this.renderProjectListItems()
            }
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Generate HTML for project list items
   */
  private renderProjectListItems(): string {
    const displayProjects = this.filteredProjects;
    return displayProjects.map((project, index) => `
      <div
        class="project-item flex items-center gap-2 px-4 py-3 cursor-pointer ${this.selectedIndex === index
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }"
        data-index="${index}"
      >
        <svg class="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <span class="flex-1 text-sm truncate">${this.escapeHtml(project.name)}</span>
      </div>
    `).join('');
  }

  /**
   * Attach event listeners to UI elements
   * Uses clone-and-replace pattern to prevent duplicate listeners
   */
  private attachEventListeners(): void {
    // Backdrop click to close
    const backdrop = this.querySelector('#backdrop');
    if (backdrop) {
      const newBackdrop = backdrop.cloneNode(true);
      backdrop.replaceWith(newBackdrop);
      (newBackdrop as HTMLElement).addEventListener('click', (e) => {
        if (e.target === newBackdrop) {
          this.close();
        }
      });
    }

    // Search input
    const searchInput = this.querySelector('#search-input') as HTMLInputElement;
    if (searchInput) {
      const newInput = searchInput.cloneNode(true);
      searchInput.replaceWith(newInput);
      (newInput as HTMLInputElement).addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.handleSearch();
      });
    }

    // Project items
    this.attachProjectListListeners();
  }

  /**
   * Attach listeners to project list items
   */
  private attachProjectListListeners(): void {
    const projectItems = this.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);

      const index = parseInt((newItem as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newItem as HTMLElement).addEventListener('click', () => {
          this.selectProject(index);
        });

        (newItem as HTMLElement).addEventListener('mouseenter', () => {
          this.selectedIndex = index;
          this.renderProjectList();
        });
      }
    });
  }

  /**
   * Re-render the project list
   */
  private renderProjectList(): void {
    const projectList = this.querySelector('#project-list');
    if (projectList) {
      const displayProjects = this.filteredProjects;
      const hasNoResults = this.projects.length > 0 && displayProjects.length === 0 && this.searchQuery.trim() !== '';

      projectList.innerHTML = this.projects.length === 0
        ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No projects available</div>'
        : hasNoResults
        ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No projects found</div>'
        : this.renderProjectListItems();

      this.attachProjectListListeners();
    }
  }

  /**
   * Handle search input changes
   */
  private handleSearch(): void {
    const displayProjects = this.filteredProjects;

    // Reset selection to first item when search changes
    if (displayProjects.length > 0) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = -1;
    }

    // Re-render project list
    this.renderProjectList();
  }

  /**
   * Attach keyboard handler for navigation
   */
  private attachKeyboardHandler(): void {
    // Remove existing handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    this.keyboardHandler = (e: KeyboardEvent) => {
      const displayProjects = this.filteredProjects;

      // Allow navigation and action keys even when search input is focused
      const isNavigationKey = e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape';
      const searchInput = this.querySelector('#search-input');
      if (document.activeElement === searchInput && !isNavigationKey) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.navigateDown(displayProjects);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigateUp(displayProjects);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0 && displayProjects.length > 0) {
            this.selectProject(this.selectedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Navigate down in the list
   */
  private navigateDown(projects: Project[]): void {
    if (this.selectedIndex < projects.length - 1) {
      this.selectedIndex++;
      this.renderProjectList();
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Navigate up in the list
   */
  private navigateUp(projects: Project[]): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.renderProjectList();
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Scroll selected item into view
   */
  private scrollSelectedItemIntoView(): void {
    const selectedItem = this.querySelector('.project-item.bg-blue-50, .project-item.dark\\:bg-blue-900\\/30');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Select a project by index and dispatch event
   */
  private selectProject(index: number): void {
    const displayProjects = this.filteredProjects;
    if (index < 0 || index >= displayProjects.length) {
      return;
    }

    const project = displayProjects[index];

    // Dispatch project-selected event (same format as ProjectPanel)
    this.dispatchEvent(new CustomEvent('project-selected', {
      detail: { project },
      bubbles: true,
      composed: true
    }));

    // Close the popup
    this.close();
  }

  /**
   * Close the popup
   */
  private close(): void {
    // Dispatch close event
    this.dispatchEvent(new CustomEvent('quick-project-access-close', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('quick-project-access', QuickProjectAccess);
