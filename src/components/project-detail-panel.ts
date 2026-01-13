import type { Project, FileTreeNode } from '../global.d.ts';

/**
 * ProjectDetailPanel Web Component
 * Displays recursive tree view of project folder contents
 */
export class ProjectDetailPanel extends HTMLElement {
  private isCollapsed: boolean = false;
  private currentProject: Project | null = null;
  private fileTree: FileTreeNode[] = [];
  private expandedNodes: Set<string> = new Set(); // Track expanded state by path

  constructor() {
    super();
  }

  connectedCallback(): void {
    // Listen for project selection events
    this.addEventListener('project-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.handleProjectSelected(customEvent.detail.project);
    });

    this.render();
  }

  private render(): void {
    const widthClass = this.isCollapsed ? 'w-0' : 'w-64';
    const overflowClass = this.isCollapsed ? 'overflow-hidden' : 'overflow-visible';

    this.innerHTML = `
      <div class="${widthClass} ${overflowClass} bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 class="text-lg font-semibold text-gray-800 m-0">Project Detail</h2>
          <button id="toggle-btn" class="p-1 hover:bg-gray-100 rounded flex items-center justify-center bg-transparent border-0 cursor-pointer" aria-label="Toggle project detail panel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          ${this.renderContent()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderContent(): string {
    // No project selected
    if (!this.currentProject) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">No project selected</p>
        </div>
      `;
    }

    // Project selected but no files
    if (this.fileTree.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <p class="text-sm text-gray-400 m-0">Empty project folder</p>
        </div>
      `;
    }

    // Render file tree
    return `
      <div class="space-y-1">
        <p class="text-xs text-gray-500 mb-2 m-0">
          ${this.fileTree.length} items
        </p>
        ${this.fileTree.map(node => this.renderTreeNode(node, 0)).join('')}
      </div>
    `;
  }

  /**
   * Recursively render a tree node with proper indentation
   */
  private renderTreeNode(node: FileTreeNode, depth: number): string {
    const isExpanded = this.expandedNodes.has(node.path);
    const indent = depth * 16; // 16px per level

    if (node.type === 'directory') {
      const hasChildren = node.children && node.children.length > 0;

      return `
        <div class="tree-node" data-path="${this.escapeHtml(node.path)}">
          <div class="flex items-center gap-1 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
               style="padding-left: ${indent}px"
               data-type="directory-toggle"
               data-path="${this.escapeHtml(node.path)}">

            <!-- Chevron icon -->
            <svg class="w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>

            <!-- Folder icon -->
            <svg class="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>

            <!-- Folder name -->
            <span class="text-sm text-gray-700 truncate">${this.escapeHtml(node.name)}</span>
          </div>

          <!-- Children (if expanded) -->
          ${isExpanded && hasChildren ? `
            <div class="directory-children">
              ${node.children!.map(child => this.renderTreeNode(child, depth + 1)).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // File node
      return `
        <div class="tree-node" data-path="${this.escapeHtml(node.path)}">
          <div class="flex items-center gap-1 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
               style="padding-left: ${indent + 16}px"
               data-type="file"
               data-path="${this.escapeHtml(node.path)}">

            <!-- Spacer for alignment -->
            <span class="w-3 h-3 flex-shrink-0"></span>

            <!-- File icon -->
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>

            <!-- File name -->
            <span class="text-sm text-gray-600 truncate">${this.escapeHtml(node.name)}</span>
          </div>
        </div>
      `;
    }
  }

  private attachEventListeners(): void {
    // Toggle button
    const toggleBtn = this.querySelector('#toggle-btn');
    if (toggleBtn) {
      const newBtn = toggleBtn.cloneNode(true);
      toggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.toggle());
    }

    // Tree node clicks (for expanding/collapsing directories)
    this.querySelectorAll('[data-type="directory-toggle"]').forEach(element => {
      // Clone and replace to prevent duplicate event listeners
      const newElement = element.cloneNode(true);
      element.replaceWith(newElement);

      const path = (newElement as HTMLElement).getAttribute('data-path');
      if (!path) return;

      (newElement as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDirectory(path);
      });
    });

    // File clicks (for future features like opening files)
    this.querySelectorAll('[data-type="file"]').forEach(element => {
      // Clone and replace to prevent duplicate event listeners
      const newElement = element.cloneNode(true);
      element.replaceWith(newElement);

      const path = (newElement as HTMLElement).getAttribute('data-path');
      if (!path) return;

      (newElement as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('File clicked:', path);
        // Future: Open file in editor or show file details
      });
    });
  }

  /**
   * Handle project selection event
   */
  private async handleProjectSelected(project: Project): Promise<void> {
    this.currentProject = project;
    this.expandedNodes.clear(); // Reset expanded state

    if (window.electronAPI) {
      try {
        // Load file tree with default options
        this.fileTree = await window.electronAPI.getFileTree(project.path, {
          excludeHidden: true
        });
        this.render();
        this.attachEventListeners();
      } catch (error) {
        console.error('Failed to load file tree:', error);
        this.fileTree = [];
        this.render();
        this.attachEventListeners();
      }
    }
  }

  /**
   * Toggle directory expanded/collapsed state
   */
  private toggleDirectory(path: string): void {
    if (this.expandedNodes.has(path)) {
      this.expandedNodes.delete(path);
    } else {
      this.expandedNodes.add(path);
    }
    this.render();
    this.attachEventListeners();
  }

  /**
   * Toggle panel collapse/expand
   */
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
customElements.define('project-detail-panel', ProjectDetailPanel);
