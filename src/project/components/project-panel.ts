import { getProjectManagementAPI } from '../api';
import type { Project, ProjectManagementAPI } from '../types';

/**
 * ProjectPanel Web Component
 * A collapsible left sidebar panel with project management
 */
export class ProjectPanel extends HTMLElement {
  private container: HTMLElement | null = null;
  private isCollapsed: boolean = false;
  private projects: Project[] = [];
  private selectedProject: Project | null = null;
  private api: ProjectManagementAPI;

  constructor() {
    super();
    this.api = getProjectManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    this.render();
    this.attachEventListeners();
    // Load projects on component mount
    await this.loadProjects();
  }

  private render(): void {
    const widthClass = this.isCollapsed ? 'w-0' : 'w-64';
    const overflowClass = this.isCollapsed ? 'overflow-hidden' : 'overflow-visible';

    this.innerHTML = `
      <div class="${widthClass} ${overflowClass} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out" id="project-panel-container">
        <!-- Header Section -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0">Projects</h2>
          <button id="toggle-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center justify-center bg-transparent border-0 cursor-pointer" aria-label="Toggle project panel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- Add Project Button -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button id="add-project-btn" class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors cursor-pointer border-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Project
          </button>
        </div>

        <!-- Projects List -->
        <div class="flex-1 overflow-y-auto p-3">
          <div id="projects-list" class="space-y-1">
            <!-- Projects will be rendered here -->
          </div>
        </div>
      </div>
    `;

    this.container = this.querySelector('div');
    // Re-attach event listeners after re-rendering
    this.attachEventListeners();
    // Re-render projects if they exist
    if (this.projects.length > 0) {
      this.renderProjects();
    }
  }

  private attachEventListeners(): void {
    const toggleBtn = this.querySelector('#toggle-btn');
    const addProjectBtn = this.querySelector('#add-project-btn');

    if (toggleBtn) {
      const newBtn = toggleBtn.cloneNode(true);
      toggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.toggle());
    }

    if (addProjectBtn) {
      const newBtn = addProjectBtn.cloneNode(true);
      addProjectBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.addProject());
    }
  }

  private toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.render();

    // Dispatch custom event for parent components
    this.dispatchEvent(new CustomEvent('panel-toggle', {
      detail: { panel: 'left', collapsed: this.isCollapsed },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Load projects from storage
   */
  private async loadProjects(): Promise<void> {
    try {
      this.projects = await this.api.getProjects();
      this.renderProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  /**
   * Open folder picker and add project
   */
  private async addProject(): Promise<void> {
    try {
      const folderPath = await this.api.openFolderDialog();
      if (folderPath) {
        this.projects = await this.api.addProject(folderPath);
        this.renderProjects();
      }
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  }

  /**
   * Remove a project
   */
  private async removeProject(project: Project): Promise<void> {
    try {
      this.projects = await this.api.removeProject(project.path);
      if (this.selectedProject?.path === project.path) {
        this.selectedProject = null;
      }
      this.renderProjects();
    } catch (error) {
      console.error('Failed to remove project:', error);
    }
  }

  /**
   * Select a project and emit event
   */
  private selectProject(project: Project): void {
    this.selectedProject = project;

    // Emit custom event for future features
    this.dispatchEvent(new CustomEvent('project-selected', {
      detail: { project },
      bubbles: true,
      composed: true
    }));

    this.renderProjects();
  }

  /**
   * Render the projects list
   */
  private renderProjects(): void {
    const listContainer = this.querySelector('#projects-list');
    if (!listContainer) return;

    if (this.projects.length === 0) {
      listContainer.innerHTML = `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4 m-0">
          No projects yet.<br>Click "Add Project" to get started.
        </p>
      `;
      return;
    }

    listContainer.innerHTML = this.projects.map(project => {
      const isSelected = this.selectedProject?.path === project.path;
      return `
        <div class="group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}"
             data-project-path="${this.escapeHtml(project.path)}">

          <!-- Folder Icon -->
          <svg class="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>

          <!-- Project Name -->
          <span class="flex-1 text-sm truncate">${this.escapeHtml(project.name)}</span>

          <!-- Remove Button (visible on hover) -->
          <button class="remove-btn opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity cursor-pointer border-0 bg-transparent"
                  data-project-path="${this.escapeHtml(project.path)}" title="Remove project">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

        </div>
      `;
    }).join('');

    // Attach event listeners for each project item
    listContainer.querySelectorAll('[data-project-path]').forEach(item => {
      const path = item.getAttribute('data-project-path');
      const project = this.projects.find(p => p.path === path);
      if (!project) return;

      // Click to select
      item.addEventListener('click', (e) => {
        // Don't select if remove button was clicked
        if ((e.target as HTMLElement).closest('.remove-btn')) return;
        this.selectProject(project);
      });

      // Remove button
      const removeBtn = item.querySelector('.remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeProject(project);
        });
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
customElements.define('project-panel', ProjectPanel);
