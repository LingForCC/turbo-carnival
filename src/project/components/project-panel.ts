import { getProjectManagementAPI } from '../api';
import type { FileTreeNode, ProjectManagementAPI } from '../types';

/**
 * ProjectPanel Web Component
 * A collapsible left sidebar panel with file tree browser
 */
export class ProjectPanel extends HTMLElement {
  private isCollapsed: boolean = false;
  private fileTree: FileTreeNode[] = [];
  private expandedNodes: Set<string> = new Set();
  private selectedFolder: FileTreeNode | null = null;
  private api: ProjectManagementAPI;

  constructor() {
    super();
    this.api = getProjectManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    this.render();
    this.attachEventListeners();
    await this.loadFileTree();
    this.api.onProjectsChanged(() => this.loadFileTree());
  }

  private render(): void {
    const widthClass = this.isCollapsed ? 'w-0' : 'w-64';
    const overflowClass = this.isCollapsed ? 'overflow-hidden' : 'overflow-visible';

    this.innerHTML = `
      <div class="${widthClass} ${overflowClass} h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out" id="project-panel-container">
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0">File Browser</h2>
          <button id="toggle-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center justify-center bg-transparent border-0 cursor-pointer" aria-label="Toggle file browser panel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <div id="file-tree" class="space-y-1"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    if (this.fileTree.length > 0) {
      this.renderFileTree();
    }
  }

  private attachEventListeners(): void {
    const toggleBtn = this.querySelector('#toggle-btn');
    if (toggleBtn) {
      const newBtn = toggleBtn.cloneNode(true);
      toggleBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.toggle());
    }
  }

  private toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.render();
    this.dispatchEvent(new CustomEvent('panel-toggle', {
      detail: { panel: 'left', collapsed: this.isCollapsed },
      bubbles: true,
      composed: true
    }));
  }

  private async loadFileTree(): Promise<void> {
    try {
      this.fileTree = await this.api.getFileTree({ excludeHidden: true });
      this.renderFileTree();
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }

  private renderFileTree(): void {
    const container = this.querySelector('#file-tree');
    if (!container) return;

    if (this.fileTree.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4 m-0">Configure a root folder in Settings to browse its files.</p>`;
      return;
    }

    container.innerHTML = this.fileTree.map(node => this.renderTreeNode(node, 0)).join('');
    this.attachTreeNodeListeners();
  }

  private renderTreeNode(node: FileTreeNode, depth: number): string {
    const isExpanded = this.expandedNodes.has(node.path);
    const isSelected = this.selectedFolder?.path === node.path;
    const indent = depth * 16;
    const escapedPath = this.escapeHtml(node.path);
    const escapedName = this.escapeHtml(node.name);

    if (node.type === 'directory') {
      const hasChildren = node.children && node.children.length > 0;
      const chevronClass = `w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`;
      const folderIconClass = `w-4 h-4 ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-blue-400 dark:text-blue-500'} flex-shrink-0`;
      const nameClass = `text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'} truncate`;
      const rowClass = `flex items-center gap-1 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer`;
      const rowStyle = `margin-left: ${indent}px`;

      let childrenHtml = '';
      if (isExpanded && hasChildren) {
        childrenHtml = `<div class="directory-children">${node.children!.map(child => this.renderTreeNode(child, depth + 1)).join('')}</div>`;
      }

      return `<div class="tree-node" data-path="${escapedPath}"><div class="${rowClass}" style="${rowStyle}"><button class="p-0 bg-transparent border-0 cursor-pointer flex items-center justify-center" data-type="directory-toggle" data-path="${escapedPath}" aria-label="Toggle ${escapedName}"><svg class="${chevronClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7M5 5l7 7-7 7"></path></svg></button><div class="flex items-center gap-1 flex-1 min-w-0 cursor-pointer" data-type="directory-select" data-path="${escapedPath}"><svg class="${folderIconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2z"></path></svg><span class="${nameClass}">${escapedName}</span></div></div>${childrenHtml}</div>`;
    } else {
      // File node
      const fileRowClass = `flex items-center gap-1 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded`;
      const fileRowStyle = `margin-left: ${indent}px`;

      return `<div class="tree-node" data-path="${escapedPath}"><div class="${fileRowClass}" style="${fileRowStyle}" data-type="file" data-path="${escapedPath}"><span class="w-3 h-3 flex-shrink-0"></span><svg class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg><span class="text-sm text-gray-600 dark:text-gray-400 truncate">${escapedName}</span></div></div>`;
    }
  }

  private attachTreeNodeListeners(): void {
    // Chevron click toggles expand/collapse
    this.querySelectorAll('[data-type="directory-toggle"]').forEach(element => {
      const newElement = element.cloneNode(true);
      element.replaceWith(newElement);
      const path = (newElement as HTMLElement).getAttribute('data-path');
      if (!path) return;

      (newElement as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDirectory(path);
      });
    });

    // Folder name/icon click selects the folder
    this.querySelectorAll('[data-type="directory-select"]').forEach(element => {
      const newElement = element.cloneNode(true);
      element.replaceWith(newElement);
      const path = (newElement as HTMLElement).getAttribute('data-path');
      if (!path) return;

      (newElement as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const node = this.findNodeByPath(path, this.fileTree);
        if (node) {
          this.selectFolder(node);
        }
      });
    });

    this.querySelectorAll('[data-type="file"]').forEach(element => {
      const newElement = element.cloneNode(true);
      element.replaceWith(newElement);
      const path = (newElement as HTMLElement).getAttribute('data-path');
      if (!path) return;

      (newElement as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('File clicked:', path);
      });
    });
  }

  private findNodeByPath(path: string, nodes: FileTreeNode[]): FileTreeNode | null {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = this.findNodeByPath(path, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  private toggleDirectory(path: string): void {
    if (this.expandedNodes.has(path)) {
      this.expandedNodes.delete(path);
    } else {
      this.expandedNodes.add(path);
    }
    this.renderFileTree();
  }

  private selectFolder(folder: FileTreeNode): void {
    this.selectedFolder = folder;
    this.dispatchEvent(new CustomEvent('project-selected', {
      detail: { project: { path: folder.path, name: folder.name } },
      bubbles: true,
      composed: true
    }));
    this.renderFileTree();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public collapse(): void {
    if (!this.isCollapsed) this.toggle();
  }

  public expand(): void {
    if (this.isCollapsed) this.toggle();
  }

  public getCollapsed(): boolean {
    return this.isCollapsed;
  }

  public getSelectedFolder(): FileTreeNode | null {
    return this.selectedFolder;
  }

  /**
   * Navigate to a specific folder path
   * Expands all parent folders and selects the target folder
   */
  public async navigateToFolder(path: string): Promise<void> {
    // Find the target node
    const targetNode = this.findNodeByPath(path, this.fileTree);
    if (!targetNode) return;

    // Expand all parent folders
    this.expandPathToFolder(path);

    // Select the folder
    this.selectedFolder = targetNode;
    this.renderFileTree();

    // Scroll into view after render
    requestAnimationFrame(() => {
      const element = this.querySelector(`[data-path="${this.escapeHtml(path)}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /**
   * Expand all parent folders leading to a path
   */
  private expandPathToFolder(targetPath: string): void {
    // Get all parent paths
    const pathsToExpand: string[] = [];
    let currentPath = targetPath;

    // Walk up the path tree to find all parent directories
    while (currentPath.includes('/') || currentPath.includes('\\')) {
      const lastSep = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
      if (lastSep === -1) break;
      currentPath = currentPath.substring(0, lastSep);
      if (currentPath) {
        pathsToExpand.unshift(currentPath);
      }
    }

    // Expand each parent path if it exists in the tree
    for (const path of pathsToExpand) {
      const node = this.findNodeByPath(path, this.fileTree);
      if (node && node.type === 'directory') {
        this.expandedNodes.add(path);
      }
    }
  }
}

customElements.define('project-panel', ProjectPanel);
