import { getSnippetManagementAPI } from '../api/snippet-management';
import { getSettingsManagementAPI } from '../api/settings-management';
import type { SnippetFile, SnippetManagementAPI } from '../types/snippet-management';
import type { SettingsManagementAPI } from '../types/settings-management';

/**
 * SnippetWindow - Snippets Web Component
 *
 * Features:
 * - File list sidebar with user-provided names
 * - Plain text textarea with auto-save (500ms debounce)
 * - Rename dialog for editing snippet names
 * - Keyboard navigation (arrow keys + Enter)
 * - Enter copies content to clipboard and closes window
 * - Delete confirmation
 * - Handles "no save location configured" error gracefully
 * - Dark mode support synced with app settings
 */
export class SnippetWindow extends HTMLElement {
  private api: SnippetManagementAPI;
  private settingsAPI: SettingsManagementAPI;
  private snippetFiles: SnippetFile[] = [];
  private selectedSnippet: SnippetFile | null = null;
  private selectedIndex: number = -1;
  private content: string = '';
  private saveTimeout: number | null = null;
  private saveStatus: 'saved' | 'saving' | 'unsaved' | 'error' = 'saved';
  private noLocationConfigured: boolean = false;
  private currentTheme: 'light' | 'dark' = 'light';
  private renamingSnippetIndex: number = -1;
  private contentTextarea: HTMLTextAreaElement | null = null;
  private handleKeyDownBound: (e: KeyboardEvent) => void = () => {};

  constructor() {
    super();
    this.api = getSnippetManagementAPI();
    this.settingsAPI = getSettingsManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    // Load theme preference first, before rendering
    await this.loadTheme();
    // Load snippets
    await this.loadSnippets();
    // Render once with all data loaded
    this.render();
    this.attachEventListeners();
  }

  /**
   * Load theme preference from settings
   */
  private async loadTheme(): Promise<void> {
    const settings = await this.settingsAPI.getSettings();
    this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
    this.applyTheme();
  }

  /**
   * Apply theme to the document
   */
  private applyTheme(): void {
    const htmlElement = document.documentElement;
    if (this.currentTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }

  /**
   * Load snippets from the save location
   * Handles the case when no save location is configured
   */
  private async loadSnippets(): Promise<void> {
    try {
      this.snippetFiles = await this.api.getSnippetFiles();
      this.noLocationConfigured = false;

      // Select first snippet if available
      if (this.snippetFiles.length > 0) {
        this.selectedSnippet = this.snippetFiles[0];
        this.selectedIndex = 0;
        this.content = this.selectedSnippet.content;
      } else {
        this.selectedSnippet = null;
        this.selectedIndex = -1;
        this.content = '';
      }
    } catch (error) {
      // Check if error is "SNIPPET_NO_LOCATION"
      if (error instanceof Error && error.message === 'SNIPPET_NO_LOCATION') {
        this.noLocationConfigured = true;
        this.snippetFiles = [];
        this.selectedSnippet = null;
        this.selectedIndex = -1;
        this.content = '';
      } else {
        console.error('Failed to load snippets:', error);
        this.showErrorMessage('Failed to load snippets');
        // Set empty state on error
        this.snippetFiles = [];
        this.selectedSnippet = null;
        this.selectedIndex = -1;
        this.content = '';
      }
    }
  }

  /**
   * Create a new snippet
   */
  private async createNewSnippet(): Promise<void> {
    try {
      const newSnippet = await this.api.createSnippetFile('New Snippet', '');
      this.snippetFiles.push(newSnippet);
      this.selectedSnippet = newSnippet;
      this.selectedIndex = this.snippetFiles.length - 1;
      this.content = '';
      this.renderFileList();
      this.renderContent();
      this.updateAddButton();
    } catch (error) {
      console.error('Failed to create new snippet:', error);
      if (error instanceof Error && error.message === 'SNIPPET_NO_LOCATION') {
        this.showErrorMessage('Please configure save location in Settings');
      } else {
        this.showErrorMessage('Failed to create new snippet');
      }
    }
  }

  /**
   * Render the snippet UI
   */
  private render(): void {
    this.innerHTML = `
      <div class="flex h-screen bg-white dark:bg-gray-900">
        <!-- Sidebar -->
        <div class="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
                Snippets
              </h2>
              <button id="add-snippet-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent" ${this.noLocationConfigured ? 'disabled' : ''} title="Add Snippet">
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- File List -->
          <div id="snippet-list" class="flex-1 overflow-y-auto p-2 space-y-1">
            ${this.noLocationConfigured
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
              : this.snippetFiles.length === 0
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No snippets yet. Click + to create one.</div>'
              : this.renderSnippetListItems()
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
          <!-- Toolbar -->
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span id="snippet-name" class="text-sm text-gray-600 dark:text-gray-400">
              ${this.selectedSnippet ? this.escapeHtml(this.selectedSnippet.name) : 'No snippet selected'}
            </span>
            <span id="save-status" class="text-xs text-gray-500 dark:text-gray-400">
              ${this.noLocationConfigured ? 'Not configured' : 'Saved'}
            </span>
          </div>

          <!-- Editor -->
          <div class="flex-1 p-4">
            ${this.noLocationConfigured
              ? '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Please configure snippet save location in App Settings</div>'
              : this.selectedSnippet !== null && this.selectedSnippet !== undefined
              ? `<textarea
              id="snippet-textarea"
              class="w-full h-full resize-none border-0 outline-none bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed"
              placeholder="Type your snippet content here..."
            >${this.escapeHtml(this.content)}</textarea>`
              : '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Select a snippet or create a new one</div>'
            }
          </div>
        </div>
      </div>

      <!-- Rename Dialog -->
      <div id="rename-dialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${this.renamingSnippetIndex >= 0 ? '' : 'hidden'}">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Rename Snippet</h3>
          <input
            type="text"
            id="rename-input"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            placeholder="Enter new name"
            value="${this.renamingSnippetIndex >= 0 ? this.escapeHtml(this.snippetFiles[this.renamingSnippetIndex]?.name || '') : ''}"
          />
          <div class="flex justify-end gap-3 mt-6">
            <button
              id="rename-cancel-btn"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border-0 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="rename-save-btn"
              class="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md border-0 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;

    this.contentTextarea = this.querySelector('#snippet-textarea');
    this.attachEventListeners();
  }

  /**
   * Generate HTML for snippet list items
   */
  private renderSnippetListItems(): string {
    return this.snippetFiles.map((snippet, index) => `
      <div class="snippet-item-container group flex items-center gap-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${this.selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
        <div
          class="snippet-item flex-1 p-2 rounded cursor-pointer"
          data-index="${index}"
        >
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            ${this.escapeHtml(snippet.name)}
          </div>
        </div>
        <button
          class="edit-snippet-btn opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-opacity"
          data-index="${index}"
          title="Rename snippet"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button
          class="delete-snippet-btn opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
          data-index="${index}"
          title="Delete snippet"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  /**
   * Re-render the snippet list
   */
  private renderFileList(): void {
    const snippetList = this.querySelector('#snippet-list');
    if (snippetList) {
      snippetList.innerHTML = this.noLocationConfigured
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
        : this.snippetFiles.length === 0
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No snippets yet. Click + to create one.</div>'
        : this.renderSnippetListItems();
      this.attachSnippetListListeners();
    }
  }

  /**
   * Re-render the content area
   */
  private renderContent(): void {
    const textarea = this.querySelector('#snippet-textarea') as HTMLTextAreaElement;
    const snippetName = this.querySelector('#snippet-name');

    if (textarea) {
      textarea.value = this.content;
    }

    if (snippetName && this.selectedSnippet) {
      snippetName.textContent = this.selectedSnippet.name;
    }
  }

  /**
   * Update the add button state
   */
  private updateAddButton(): void {
    const addBtn = this.querySelector('#add-snippet-btn');
    if (addBtn) {
      if (this.noLocationConfigured) {
        (addBtn as HTMLButtonElement).disabled = true;
      } else {
        (addBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  /**
   * Attach event listeners to UI elements
   * Uses clone-and-replace pattern to prevent duplicate listeners
   */
  private attachEventListeners(): void {
    // Remove old keyboard listener if exists to avoid duplicates
    document.removeEventListener('keydown', this.handleKeyDownBound);
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDownBound);

    // Add button - use clone-and-replace pattern
    const addBtn = this.querySelector('#add-snippet-btn');
    if (addBtn && !this.noLocationConfigured) {
      const newAddBtn = addBtn.cloneNode(true);
      addBtn.replaceWith(newAddBtn);
      (newAddBtn as HTMLElement).addEventListener('click', () => this.createNewSnippet());
    }

    // Textarea input - with debounced auto-save
    const textarea = this.querySelector('#snippet-textarea');
    if (textarea) {
      // Remove old listener by cloning
      const newTextarea = textarea.cloneNode(true);
      textarea.replaceWith(newTextarea);
      (newTextarea as HTMLElement).addEventListener('input', () => this.handleTextareaInput());
      this.contentTextarea = newTextarea as HTMLTextAreaElement;
    }

    // Snippet list items and delete buttons
    this.attachSnippetListListeners();
  }

  /**
   * Attach listeners to snippet list items
   */
  private attachSnippetListListeners(): void {
    const snippetItems = this.querySelectorAll('.snippet-item');
    snippetItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);

      const index = parseInt((newItem as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newItem as HTMLElement).addEventListener('click', () => this.selectSnippet(index));
      }
    });

    // Edit snippet buttons
    const editBtns = this.querySelectorAll('.edit-snippet-btn');
    editBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);

      const index = parseInt((newBtn as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newBtn as HTMLElement).addEventListener('click', (e) => {
          e.stopPropagation();
          this.openRenameDialog(index);
        });
      }
    });

    // Delete snippet buttons
    const deleteBtns = this.querySelectorAll('.delete-snippet-btn');
    deleteBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);

      const index = parseInt((newBtn as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newBtn as HTMLElement).addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteSnippet(index);
        });
      }
    });

    // Rename dialog listeners
    this.attachRenameDialogListeners();
  }

  /**
   * Attach listeners to rename dialog
   */
  private attachRenameDialogListeners(): void {
    const renameDialog = this.querySelector('#rename-dialog');
    if (!renameDialog) return;

    // Cancel button
    const cancelBtn = this.querySelector('#rename-cancel-btn');
    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newCancelBtn);
      (newCancelBtn as HTMLElement).addEventListener('click', () => this.closeRenameDialog());
    }

    // Save button
    const saveBtn = this.querySelector('#rename-save-btn');
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.replaceWith(newSaveBtn);
      (newSaveBtn as HTMLElement).addEventListener('click', () => this.saveRename());
    }

    // Input Enter and Escape keys
    const renameInput = this.querySelector('#rename-input');
    if (renameInput) {
      const newInput = renameInput.cloneNode(true);
      renameInput.replaceWith(newInput);
      (newInput as HTMLElement).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveRename();
        } else if (e.key === 'Escape') {
          this.closeRenameDialog();
        }
      });
    }

    // Click outside to close
    (renameDialog as HTMLElement).addEventListener('click', (e) => {
      if (e.target === renameDialog) {
        this.closeRenameDialog();
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Don't intercept if editing textarea or rename dialog is open
    if (document.activeElement === this.contentTextarea) {
      return;
    }
    if ((document.activeElement as HTMLInputElement).id === 'rename-input') {
      return;
    }
    if (this.renamingSnippetIndex >= 0) {
      return;
    }

    if (this.snippetFiles.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.snippetFiles.length - 1);
        this.selectSnippet(this.selectedIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.selectSnippet(this.selectedIndex);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedSnippet) {
          this.copyAndClose();
        }
        break;
    }
  }

  /**
   * Select a snippet by index
   */
  private async selectSnippet(index: number): Promise<void> {
    if (index < 0 || index >= this.snippetFiles.length) {
      return;
    }

    // Auto-save current snippet before switching
    if (this.selectedSnippet && this.saveStatus === 'unsaved') {
      await this.saveContent();
    }

    this.selectedIndex = index;
    this.selectedSnippet = this.snippetFiles[index];
    this.content = this.selectedSnippet.content;
    this.renderFileList();
    this.renderContent();
    this.updateSaveStatus('saved');
  }

  /**
   * Copy snippet content to clipboard and close window
   */
  private async copyAndClose(): Promise<void> {
    if (!this.selectedSnippet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.selectedSnippet.content);
      if (window.electronAPI) {
        window.electronAPI.closeSnippetWindow();
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showErrorMessage('Failed to copy to clipboard');
    }
  }

  /**
   * Open rename dialog
   */
  private openRenameDialog(index: number): void {
    if (index < 0 || index >= this.snippetFiles.length) {
      return;
    }

    this.renamingSnippetIndex = index;
    this.render();

    // Select and focus the input
    const input = this.querySelector('#rename-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }

    // Attach dialog listeners
    this.attachRenameDialogListeners();
  }

  /**
   * Close rename dialog
   */
  private closeRenameDialog(): void {
    this.renamingSnippetIndex = -1;
    this.render();
  }

  /**
   * Save rename
   */
  private async saveRename(): Promise<void> {
    if (this.renamingSnippetIndex < 0 || this.renamingSnippetIndex >= this.snippetFiles.length) {
      return;
    }

    const input = this.querySelector('#rename-input') as HTMLInputElement;
    if (!input) return;

    const newName = input.value.trim();
    const snippet = this.snippetFiles[this.renamingSnippetIndex];

    if (!newName || newName === snippet.name) {
      this.closeRenameDialog();
      return;
    }

    try {
      await this.api.renameSnippetFile(snippet.fileName, newName);
      // Reload snippets to get updated list
      await this.loadSnippets();
      // Find the renamed snippet
      const newSnippet = this.snippetFiles.find(s => s.name === newName);
      if (newSnippet) {
        this.selectedIndex = this.snippetFiles.indexOf(newSnippet);
        this.selectedSnippet = newSnippet;
      }
      this.renamingSnippetIndex = -1;
      this.render();
    } catch (error) {
      console.error('Failed to rename snippet:', error);
      this.showErrorMessage('Failed to rename snippet');
      this.closeRenameDialog();
    }
  }

  /**
   * Handle textarea input with debounced auto-save
   */
  private handleTextareaInput(): void {
    const textarea = this.querySelector('#snippet-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    this.content = textarea.value;
    this.updateSaveStatus('unsaved');

    // Debounce save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      this.saveContent();
    }, 500);
  }

  /**
   * Save content to file
   */
  private async saveContent(): Promise<void> {
    if (!this.selectedSnippet) return;

    this.updateSaveStatus('saving');

    try {
      await this.api.saveSnippetContent(this.selectedSnippet.fileName, this.content);

      // Update the snippet content in memory
      const snippetIndex = this.snippetFiles.findIndex(s => s.fileName === this.selectedSnippet!.fileName);
      if (snippetIndex !== -1) {
        this.snippetFiles[snippetIndex].content = this.content;
      }

      this.updateSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save snippet:', error);
      this.updateSaveStatus('error');
      this.showErrorMessage('Failed to save snippet');
    }
  }

  /**
   * Update the save status indicator
   */
  private updateSaveStatus(status: 'saved' | 'saving' | 'unsaved' | 'error'): void {
    this.saveStatus = status;
    const statusEl = this.querySelector('#save-status');

    if (statusEl) {
      const statusTexts: Record<typeof status, string> = {
        saved: 'Saved',
        saving: 'Saving...',
        unsaved: 'Unsaved',
        error: 'Error saving'
      };

      const statusColors: Record<typeof status, string> = {
        saved: 'text-gray-500 dark:text-gray-400',
        saving: 'text-blue-500 dark:text-blue-400',
        unsaved: 'text-yellow-600 dark:text-yellow-400',
        error: 'text-red-600 dark:text-red-400'
      };

      statusEl.textContent = statusTexts[status];
      statusEl.className = `text-xs ${statusColors[status]}`;
    }
  }

  /**
   * Show error message as toast
   */
  private showErrorMessage(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Delete a snippet with confirmation
   */
  private async deleteSnippet(index: number): Promise<void> {
    const snippet = this.snippetFiles[index];
    if (!snippet) return;

    const confirmed = confirm(`Are you sure you want to delete "${snippet.name}"?`);
    if (!confirmed) return;

    try {
      await this.api.deleteSnippetFile(snippet.fileName);

      // Remove from local array
      this.snippetFiles.splice(index, 1);

      // Update selection
      if (this.selectedIndex === index) {
        if (this.snippetFiles.length > 0) {
          this.selectedIndex = Math.min(index, this.snippetFiles.length - 1);
          this.selectedSnippet = this.snippetFiles[this.selectedIndex];
          this.content = this.selectedSnippet.content;
        } else {
          this.selectedIndex = -1;
          this.selectedSnippet = null;
          this.content = '';
        }
      } else if (this.selectedIndex > index) {
        this.selectedIndex--;
      }

      // Re-render
      this.render();
      this.updateAddButton();
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      this.showErrorMessage('Failed to delete snippet');
    }
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

customElements.define('snippet-window', SnippetWindow);
