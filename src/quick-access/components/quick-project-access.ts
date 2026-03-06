import { getProjectManagementAPI } from '../../project/api';
import type { FileTreeNode, ProjectManagementAPI } from '../../project/types';

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
  private fileTree: FileTreeNode[] = [];
  private selectedIndex: number = 0;
  private searchQuery: string = '';
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private flattenedFolders: { path: string; name: string }[] = [];

  constructor() {
    super();
    this.api = getProjectManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    await this.loadFileTree();
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
   * Load file tree from API
   */
  private async loadFileTree(): Promise<void> {
    try {
      this.fileTree = await this.api.getFileTree({ excludeHidden: true });
      this.flattenFoldersList();
      this.selectedIndex = 0;
    } catch (error) {
      console.error('Failed to load file tree:', error);
      this.fileTree = [];
    }
  }

  /**
   * Recursively flatten file tree to get all folders at */
  private flattenFoldersList(): void {
    this.flattenedFolders = [];

    const flatten = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          this.flattenedFolders.push({ path: node.path, name: node.name });
          if (node.children) {
            flatten(node.children);
          }
        }
      }
    };

    flatten(this.fileTree);
  }

  /**
   * Get filtered folders based on search query
   */
  private get filteredFolders(): { path: string; name: string }[] {
    if (!this.searchQuery.trim()) {
      return this.flattenedFolders;
    }
    const query = this.searchQuery.toLowerCase();
    return this.flattenedFolders.filter(folder =>
      folder.name.toLowerCase().includes(query)
    );
  }

  /**
   * Render the quick project access popup
   */
  private render(): void {
    const displayFolders = this.filteredFolders;
    const hasNoResults = this.fileTree.length > 0 && displayFolders.length === 0 && this.searchQuery.trim() !== '';

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
                placeholder="Search folders..."
                value="${this.escapeHtml(this.searchQuery)}"
                class="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
              <!-- Search icon -->
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7-7 7z"/>
              </svg>
            </div>
          </div>

          <!-- Folder List (scrollable) -->
          <div id="folder-list" class="flex-1 overflow-y-auto">
            ${this.fileTree.length === 0
              ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No root folder configured</div>'
              : hasNoResults
              ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No folders found</div>'
              : this.renderFolderListItems()
            }
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Generate HTML for folder list items
   */
  private renderFolderListItems(): string {
    const displayFolders = this.filteredFolders;
    return displayFolders.map((folder, index) => `
      <div
        class="folder-item flex items-center gap-2 px-4 py-3 cursor-pointer ${this.selectedIndex === index
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }"
        data-index="${index}"
        data-path="${this.escapeHtml(folder.path)}"
      >
        <svg class="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2V9a414 2-2 2-2H5a5a2z"/>
        </ <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16l87 7-7-7-7-7-7 7z"/>
        </ </svg>
        <span class="flex-1 text-sm truncate">${this.escapeHtml(folder.name)}</span>
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

    // Folder items
    this.attachFolderListListeners();
  }

  /**
   * Attach listeners to folder list items
   */
  private attachFolderListListeners(): void {
    const folderItems = this.querySelectorAll('.folder-item');
    folderItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);

      const index = parseInt((newItem as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newItem as HTMLElement).addEventListener('click', () => {
          this.selectFolder(index);
        });

        (newItem as HTMLElement).addEventListener('mouseenter', () => {
          this.selectedIndex = index;
          this.renderFolderList();
        });
      }
    });
  }

  /**
   * Re-render the folder list
   */
  private renderFolderList(): void {
    const folderList = this.querySelector('#folder-list');
    if (folderList) {
      const displayFolders = this.filteredFolders;
      const hasNoResults = this.fileTree.length > 0 && displayFolders.length === 0 && this.searchQuery.trim() !== '';

      folderList.innerHTML = this.fileTree.length === 0
        ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No root folder configured</div>'
        : hasNoResults
        ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No folders found</div>'
        : this.renderFolderListItems();

      this.attachFolderListListeners();
    }
  }

  /**
   * Handle search input changes
   */
  private handleSearch(): void {
    const displayFolders = this.filteredFolders;

    // Reset selection to first item when search changes
    if (displayFolders.length > 0) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = -1;
    }

    // Re-render folder list
    this.renderFolderList();
  }

  /**
   * Attach keyboard handler for navigation
   */
  private attachKeyboardHandler(): void {
    // Remove existing handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    this.keyboardHandler = (e: KeyboardEvent) => {
      const displayFolders = this.filteredFolders;

      // Allow navigation and action keys even when search input is focused
      const isNavigationKey = e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape';
      const searchInput = this.querySelector('#search-input');
      if (document.activeElement === searchInput && !isNavigationKey) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.navigateDown(displayFolders);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigateUp(displayFolders);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0 && displayFolders.length > 0) {
            this.selectFolder(this.selectedIndex);
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
   * Navigate down in the folder list
   */
  private navigateDown(_folders: { path: string; name: string }[]): void {
    if (this.selectedIndex < _folders.length - 1) {
      this.selectedIndex++;
      this.renderFolderList();
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Navigate up in the folder list
   */
  private navigateUp(_folders: { path: string; name: string }[]): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.renderFolderList();
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Scroll selected item into view
   */
  private scrollSelectedItemIntoView(): void {
    const selectedItem = this.querySelector('.folder-item.bg-blue-50, .folder-item.dark\\:bg-blue-900\\/30');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Select a folder by index and dispatch event
   */
  private selectFolder(index: number): void {
    const displayFolders = this.filteredFolders;
    if (index < 0 || index >= displayFolders.length) {
      return;
    }

    const folder = displayFolders[index];

    // Dispatch project-selected event (same format as ProjectPanel)
    // The folder has both path and name properties
    this.dispatchEvent(new CustomEvent('project-selected', {
      detail: { project: { path: folder.path, name: folder.name } },
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
