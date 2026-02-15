import { getNotepadManagementAPI } from '../api';
import { getSettingsManagementAPI } from '../../settings/api';
import type { NotepadFile, NotepadManagementAPI } from '../types';
import type { SettingsManagementAPI } from '../../settings/types';

/**
 * NotepadWindow - Quick Notepad Web Component
 *
 * Features:
 * - File list sidebar with timestamp-based file names
 * - Plain text textarea with auto-save (2-second debounce)
 * - New Note button for creating files
 * - Save status indicator
 * - Handles "no save location configured" error gracefully
 * - Dark mode support synced with app settings
 */
export class NotepadWindow extends HTMLElement {
  private api: NotepadManagementAPI;
  private settingsAPI: SettingsManagementAPI;
  private files: NotepadFile[] = [];
  private currentFile: NotepadFile | null = null;
  private content: string = '';
  private saveTimeout: number | null = null;
  private saveStatus: 'saved' | 'saving' | 'unsaved' | 'error' = 'saved';
  private noLocationConfigured: boolean = false;
  private currentTheme: 'light' | 'dark' = 'light';
  private unsubscribeWindowShown: (() => void) | null = null;

  constructor() {
    super();
    this.api = getNotepadManagementAPI();
    this.settingsAPI = getSettingsManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    // Load theme preference first, before rendering
    await this.loadTheme();
    await this.loadFiles();
    this.render();
    this.attachEventListeners();
    this.setupWindowShownListener();
  }

  disconnectedCallback(): void {
    // Clean up window shown listener
    if (this.unsubscribeWindowShown) {
      this.unsubscribeWindowShown();
      this.unsubscribeWindowShown = null;
    }
  }

  /**
   * Load theme preference from settings
   */
  private async loadTheme(): Promise<void> {
    try {
      const settings = await this.settingsAPI.getSettings();
      this.currentTheme = settings.theme === 'dark' ? 'dark' : 'light';
      this.applyTheme();
    } catch (error) {
      console.error('Failed to load theme:', error);
      // Default to light mode on error
      this.currentTheme = 'light';
      this.applyTheme();
    }
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
   * Set up listener for window shown event
   * Reloads files when window is shown after being hidden
   */
  private setupWindowShownListener(): void {
    this.unsubscribeWindowShown = this.api.onWindowShown(async () => {
      // Reload files and theme when window is shown
      await this.loadTheme();
      await this.loadFiles();
      this.renderFileList();
      this.renderContent();
      // Focus the textarea so user can start typing immediately
      const textarea = this.querySelector('#notepad-textarea') as HTMLTextAreaElement;
      textarea?.focus();
    });
  }

  /**
   * Load files from the notepad save location
   * Handles the case when no save location is configured
   */
  private async loadFiles(): Promise<void> {
    try {
      this.files = await this.api.getFiles();
      this.noLocationConfigured = false;

      // Load most recent file or create new one
      if (this.files.length > 0) {
        this.currentFile = this.files[0];
        this.content = await this.api.readFile(this.currentFile.path);
      } else {
        await this.createNewFile();
      }
    } catch (error) {
      // Check if error is "NOTEPAD_NO_LOCATION"
      if (error instanceof Error && error.message === 'NOTEPAD_NO_LOCATION') {
        this.noLocationConfigured = true;
        this.files = [];
        this.currentFile = null;
        this.content = '';
      } else {
        console.error('Failed to load notepad files:', error);
        this.showErrorMessage('Failed to load notepad files');
      }
    }
  }

  /**
   * Create a new notepad file
   */
  private async createNewFile(): Promise<void> {
    try {
      const newFile = await this.api.createFile();
      this.files.unshift(newFile);
      this.currentFile = newFile;
      this.content = '';
      this.renderFileList();
      this.renderContent();
    } catch (error) {
      console.error('Failed to create new file:', error);
      if (error instanceof Error && error.message === 'NOTEPAD_NO_LOCATION') {
        this.showErrorMessage('Please configure save location in Settings');
      } else {
        this.showErrorMessage('Failed to create new file');
      }
    }
  }

  /**
   * Render the notepad UI
   */
  private render(): void {
    this.innerHTML = `
      <div class="flex h-screen bg-white dark:bg-gray-900">
        <!-- Sidebar -->
        <div class="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
                Notes
              </h2>
              <button id="delete-all-btn" class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed" ${this.noLocationConfigured || this.files.length === 0 ? 'disabled' : ''} title="Delete all notes">
                Delete All
              </button>
            </div>
            <button id="add-note-btn" class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0" ${this.noLocationConfigured ? 'disabled' : ''}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Note
            </button>
          </div>

          <!-- File List -->
          <div id="file-list" class="flex-1 overflow-y-auto p-2 space-y-1">
            ${this.noLocationConfigured
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
              : this.files.length === 0
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No notes yet. Click "New Note" to create one.</div>'
              : this.renderFileListItems()
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
          <!-- Toolbar -->
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span id="file-name" class="text-sm text-gray-600 dark:text-gray-400">
              ${this.currentFile ? this.escapeHtml(this.currentFile.name) : 'No file'}
            </span>
            <span id="save-status" class="text-xs text-gray-500 dark:text-gray-400">
              ${this.noLocationConfigured ? 'Not configured' : 'Saved'}
            </span>
          </div>

          <!-- Editor -->
          <div class="flex-1 p-4">
            ${this.noLocationConfigured
              ? '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Please configure notepad save location in App Settings</div>'
              : `<textarea
              id="notepad-textarea"
              class="w-full h-full resize-none border-0 outline-none bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed"
              placeholder="Start typing your note..."
            >${this.escapeHtml(this.content)}</textarea>`
            }
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Generate HTML for file list items
   */
  private renderFileListItems(): string {
    return this.files.map(file => `
      <div class="file-item-container group flex items-center gap-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${this.currentFile?.path === file.path ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
        <div
          class="file-item flex-1 p-2 rounded cursor-pointer"
          data-file-path="${this.escapeHtml(file.path)}"
        >
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            ${this.escapeHtml(file.name)}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            ${new Date(file.modifiedAt).toLocaleString()}
          </div>
        </div>
        <button
          class="delete-note-btn opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
          data-file-path="${this.escapeHtml(file.path)}"
          title="Delete note"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  /**
   * Re-render the file list
   */
  private renderFileList(): void {
    const fileList = this.querySelector('#file-list');
    if (fileList) {
      fileList.innerHTML = this.noLocationConfigured
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
        : this.files.length === 0
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No notes yet. Click "New Note" to create one.</div>'
        : this.renderFileListItems();
      this.attachFileListListeners();
    }
  }

  /**
   * Re-render the content area
   */
  private renderContent(): void {
    const textarea = this.querySelector('#notepad-textarea') as HTMLTextAreaElement;
    const fileName = this.querySelector('#file-name');

    if (textarea) {
      textarea.value = this.content;
    }

    if (fileName && this.currentFile) {
      fileName.textContent = this.currentFile.name;
    }
  }

  /**
   * Attach event listeners to UI elements
   * Uses clone-and-replace pattern to prevent duplicate listeners
   */
  private attachEventListeners(): void {
    // Add button - use clone-and-replace pattern
    const addBtn = this.querySelector('#add-note-btn');
    if (addBtn && !this.noLocationConfigured) {
      const newAddBtn = addBtn.cloneNode(true);
      addBtn.replaceWith(newAddBtn);
      (newAddBtn as HTMLElement).addEventListener('click', () => this.createNewFile());
    }

    // Delete All button - use clone-and-replace pattern
    const deleteAllBtn = this.querySelector('#delete-all-btn');
    if (deleteAllBtn && !this.noLocationConfigured && this.files.length > 0) {
      const newDeleteAllBtn = deleteAllBtn.cloneNode(true);
      deleteAllBtn.replaceWith(newDeleteAllBtn);
      (newDeleteAllBtn as HTMLElement).addEventListener('click', () => this.deleteAllNotes());
    }

    // Textarea input - with debounced auto-save
    const textarea = this.querySelector('#notepad-textarea');
    if (textarea) {
      textarea.addEventListener('input', () => this.handleTextareaInput());
    }

    // File list items and delete buttons
    this.attachFileListListeners();
  }

  /**
   * Attach listeners to file list items
   */
  private attachFileListListeners(): void {
    const fileItems = this.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);

      const filePath = (newItem as Element).getAttribute('data-file-path');
      if (filePath) {
        (newItem as HTMLElement).addEventListener('click', () => this.switchFile(filePath));
      }
    });

    // Delete note buttons
    const deleteBtns = this.querySelectorAll('.delete-note-btn');
    deleteBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);

      const filePath = (newBtn as Element).getAttribute('data-file-path');
      if (filePath) {
        (newBtn as HTMLElement).addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent triggering file item click
          this.deleteNote(filePath);
        });
      }
    });
  }

  /**
   * Handle textarea input with debounced auto-save
   */
  private handleTextareaInput(): void {
    const textarea = this.querySelector('#notepad-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    this.content = textarea.value;
    this.updateSaveStatus('unsaved');

    // Debounce save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      this.saveContent();
    }, 2000);
  }

  /**
   * Save content to file
   */
  private async saveContent(): Promise<void> {
    if (!this.currentFile) return;

    this.updateSaveStatus('saving');

    try {
      await this.api.saveContent(this.currentFile.path, this.content);
      this.updateSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save notepad:', error);
      this.updateSaveStatus('error');
      this.showErrorMessage('Failed to save note');
    }
  }

  /**
   * Switch to a different file
   */
  private async switchFile(filePath: string): Promise<void> {
    // Auto-save current file before switching
    if (this.currentFile && this.saveStatus === 'unsaved') {
      await this.saveContent();
    }

    const file = this.files.find(f => f.path === filePath);
    if (!file) return;

    try {
      this.content = await this.api.readFile(filePath);
      this.currentFile = file;
      this.renderFileList();
      this.renderContent();
      this.updateSaveStatus('saved');
    } catch (error) {
      console.error('Failed to load file:', error);
      this.showErrorMessage('Failed to load file');
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
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Delete a single note with confirmation
   */
  private async deleteNote(filePath: string): Promise<void> {
    const file = this.files.find(f => f.path === filePath);
    if (!file) return;

    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmed) return;

    try {
      await this.api.deleteFile(filePath);

      // Remove from local files array
      this.files = this.files.filter(f => f.path !== filePath);

      // If deleted file was current file, handle that
      if (this.currentFile?.path === filePath) {
        if (this.files.length > 0) {
          // Switch to most recent file
          this.currentFile = this.files[0];
          this.content = await this.api.readFile(this.currentFile.path);
        } else {
          // No files left, create new one
          await this.createNewFile();
          return; // createNewFile already handles rendering
        }
      }

      // Re-render
      this.renderFileList();
      this.renderContent();
      this.updateDeleteAllButton();
    } catch (error) {
      console.error('Failed to delete note:', error);
      this.showErrorMessage('Failed to delete note');
    }
  }

  /**
   * Delete all notes with confirmation
   */
  private async deleteAllNotes(): Promise<void> {
    if (this.files.length === 0) return;

    // Confirm deletion
    const confirmed = confirm(
      `Are you sure you want to delete all ${this.files.length} note${this.files.length > 1 ? 's' : ''}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // Delete all files
      await Promise.all(this.files.map(file => this.api.deleteFile(file.path)));

      // Clear local files array
      this.files = [];
      this.currentFile = null;
      this.content = '';

      // Create a new file
      await this.createNewFile();
    } catch (error) {
      console.error('Failed to delete all notes:', error);
      this.showErrorMessage('Failed to delete some notes');
    }
  }

  /**
   * Update the Delete All button state
   */
  private updateDeleteAllButton(): void {
    const deleteAllBtn = this.querySelector('#delete-all-btn');
    if (deleteAllBtn) {
      if (this.noLocationConfigured || this.files.length === 0) {
        (deleteAllBtn as HTMLButtonElement).disabled = true;
      } else {
        (deleteAllBtn as HTMLButtonElement).disabled = false;
      }
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

customElements.define('notepad-window', NotepadWindow);
