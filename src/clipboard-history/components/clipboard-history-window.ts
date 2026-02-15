import { getClipboardHistoryManagementAPI } from '../api';
import { getSettingsManagementAPI } from '../../settings/api';
import type { ClipboardHistoryItem, ClipboardHistoryManagementAPI } from '../types';
import type { SettingsManagementAPI } from '../../settings/types';

/**
 * ClipboardHistoryWindow - Clipboard History Web Component
 *
 * Features:
 * - Left sidebar with history list (newest first)
 * - Right panel with content preview (text or image)
 * - First 50 characters for text, filename for images
 * - Delete individual items
 * - Clear all items
 * - Handles "no save location configured" error gracefully
 * - Dark mode support synced with app settings
 * - Keyboard navigation (arrow keys, Enter to copy)
 * - Search bar to filter items by content or filename
 */
export class ClipboardHistoryWindow extends HTMLElement {
  private api: ClipboardHistoryManagementAPI;
  private settingsAPI: SettingsManagementAPI;
  private items: ClipboardHistoryItem[] = [];
  private selectedItem: ClipboardHistoryItem | null = null;
  private selectedIndex: number = -1;
  private noLocationConfigured: boolean = false;
  private currentTheme: 'light' | 'dark' = 'light';
  private windowShownCleanup: (() => void) | null = null;
  private searchQuery: string = '';
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super();
    this.api = getClipboardHistoryManagementAPI();
    this.settingsAPI = getSettingsManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    // Load theme preference first, before rendering
    await this.loadTheme();
    // Load clipboard history items
    await this.loadItems();
    // Render once with all data loaded
    this.render();
    this.attachEventListeners();

    // Listen for window-shown event to refresh items
    this.windowShownCleanup = this.api.onClipboardHistoryWindowShown(async () => {
      await this.refreshItems();
    });
  }

  disconnectedCallback(): void {
    // Clean up window-shown listener
    if (this.windowShownCleanup) {
      this.windowShownCleanup();
      this.windowShownCleanup = null;
    }
    // Clean up keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
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
   * Load clipboard history items from the save location
   * Handles the case when no save location is configured
   */
  private async loadItems(): Promise<void> {
    try {
      this.items = await this.api.getClipboardHistoryItems();
      this.noLocationConfigured = false;

      // Reset search when loading items
      this.searchQuery = '';

      // Select first item if available
      if (this.items.length > 0) {
        this.selectedItem = this.items[0];
        this.selectedIndex = 0;
      } else {
        this.selectedItem = null;
        this.selectedIndex = -1;
      }
    } catch (error) {
      // Check if error is "CLIPBOARD_NO_LOCATION"
      if (error instanceof Error && error.message === 'CLIPBOARD_NO_LOCATION') {
        this.noLocationConfigured = true;
        this.items = [];
        this.selectedItem = null;
        this.selectedIndex = -1;
      } else {
        console.error('Failed to load clipboard history:', error);
        this.showErrorMessage('Failed to load clipboard history');
        // Set empty state on error
        this.items = [];
        this.selectedItem = null;
        this.selectedIndex = -1;
      }
    }
  }

  /**
   * Refresh items from the save location
   * Called when the window is shown again
   */
  private async refreshItems(): Promise<void> {
    // Clear search when refreshing
    this.searchQuery = '';
    await this.loadItems();
    this.render();
    this.attachEventListeners();
  }

  /**
   * Get filtered items based on search query
   */
  private get filteredItems(): ClipboardHistoryItem[] {
    if (!this.searchQuery.trim()) {
      return this.items;
    }
    const query = this.searchQuery.toLowerCase();
    return this.items.filter(item => {
      if (item.type === 'text') {
        return item.preview.toLowerCase().includes(query);
      } else {
        // For images, search in filename
        return item.fileName.toLowerCase().includes(query);
      }
    });
  }

  /**
   * Render the clipboard history UI
   */
  private render(): void {
    const displayItems = this.filteredItems;
    const hasFilteredResults = !this.noLocationConfigured && this.items.length > 0 && displayItems.length === 0 && this.searchQuery.trim() !== '';

    this.innerHTML = `
      <div class="flex h-screen bg-white dark:bg-gray-900">
        <!-- Sidebar -->
        <div class="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
                Clipboard History
              </h2>
              ${!this.noLocationConfigured && this.items.length > 0 ? `
              <button id="clear-all-btn" class="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded cursor-pointer border-0 bg-transparent" title="Clear All">
                <svg class="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
              ` : ''}
            </div>
          </div>

          <!-- Search Bar -->
          ${!this.noLocationConfigured && this.items.length > 0 ? `
          <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div class="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Search history..."
                value="${this.escapeHtml(this.searchQuery)}"
                class="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
              <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>
          ` : ''}

          <!-- Item List -->
          <div id="history-list" class="flex-1 overflow-y-auto p-2 space-y-1">
            ${this.noLocationConfigured
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
              : this.items.length === 0
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No clipboard history yet. Copy some text or images.</div>'
              : hasFilteredResults
              ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No results found</div>'
              : this.renderHistoryListItems()
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
          <!-- Toolbar -->
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span id="item-info" class="text-sm text-gray-600 dark:text-gray-400">
              ${this.selectedItem ? this.getItemInfo(this.selectedItem) : 'No item selected'}
            </span>
            <span id="item-type" class="text-xs text-gray-500 dark:text-gray-400">
              ${this.selectedItem ? (this.selectedItem.type === 'text' ? 'Text' : 'Image') : ''}
            </span>
          </div>

          <!-- Preview -->
          <div id="preview-container" class="flex-1 p-4 overflow-auto">
            ${this.noLocationConfigured
              ? '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Please configure clipboard history save location in App Settings</div>'
              : this.selectedItem !== null
              ? this.renderPreview()
              : '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Select an item to preview</div>'
            }
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Get item info string (type and timestamp)
   */
  private getItemInfo(item: ClipboardHistoryItem): string {
    const date = new Date(item.modifiedAt);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();
    return `${dateStr} ${timeStr}`;
  }

  /**
   * Generate HTML for history list items
   */
  private renderHistoryListItems(): string {
    const displayItems = this.filteredItems;
    return displayItems.map((item, index) => `
      <div class="history-item-container group flex items-center gap-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${this.selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
        <div
          class="history-item flex-1 min-w-0 p-2 rounded cursor-pointer"
          data-index="${index}"
        >
          <div class="flex items-center gap-2">
            ${item.type === 'image' ? `
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            ` : `
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            `}
            <div class="text-sm text-gray-700 dark:text-gray-300 truncate flex-1" title="${this.escapeHtml(item.preview)}">
              ${this.escapeHtml(item.preview)}
            </div>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            ${this.formatRelativeTime(item.modifiedAt)}
          </div>
        </div>
        <button
          class="delete-item-btn opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
          data-index="${index}"
          title="Delete item"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  /**
   * Render the preview content
   */
  private renderPreview(): string {
    if (!this.selectedItem) {
      return '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Select an item to preview</div>';
    }

    if (this.selectedItem.type === 'text') {
      return `
        <textarea
          id="preview-textarea"
          readonly
          class="w-full h-full resize-none border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed"
          placeholder="Loading..."
        >Loading...</textarea>
      `;
    } else {
      return `
        <div class="h-full flex items-center justify-center">
          <img
            id="preview-image"
            class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            alt="Clipboard image"
          />
        </div>
      `;
    }
  }

  /**
   * Format relative time (e.g., "2 minutes ago")
   */
  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    }
  }

  /**
   * Re-render the history list
   */
  private renderHistoryList(): void {
    const historyList = this.querySelector('#history-list');
    if (historyList) {
      const displayItems = this.filteredItems;
      const hasFilteredResults = !this.noLocationConfigured && this.items.length > 0 && displayItems.length === 0 && this.searchQuery.trim() !== '';

      historyList.innerHTML = this.noLocationConfigured
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Please configure save location in Settings</div>'
        : this.items.length === 0
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No clipboard history yet. Copy some text or images.</div>'
        : hasFilteredResults
        ? '<div class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No results found</div>'
        : this.renderHistoryListItems();
      this.attachHistoryListListeners();
    }
  }

  /**
   * Attach event listeners to UI elements
   * Uses clone-and-replace pattern to prevent duplicate listeners
   */
  private attachEventListeners(): void {
    // Clear All button
    const clearAllBtn = this.querySelector('#clear-all-btn');
    if (clearAllBtn) {
      const newBtn = clearAllBtn.cloneNode(true);
      clearAllBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.clearAll());
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
      // Focus the search input
      (newInput as HTMLInputElement).focus();
    }

    // History list items
    this.attachHistoryListListeners();

    // Keyboard navigation
    this.attachKeyboardHandler();

    // Load preview content if item is selected
    if (this.selectedItem) {
      this.loadPreviewContent();
    }
  }

  /**
   * Attach listeners to history list items
   */
  private attachHistoryListListeners(): void {
    const historyItems = this.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);

      const index = parseInt((newItem as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newItem as HTMLElement).addEventListener('click', () => this.selectItem(index));
      }
    });

    // Delete buttons
    const deleteBtns = this.querySelectorAll('.delete-item-btn');
    deleteBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);

      const index = parseInt((newBtn as Element).getAttribute('data-index') || '-1');
      if (index >= 0) {
        (newBtn as HTMLElement).addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteItem(index);
        });
      }
    });
  }

  /**
   * Select an item by index (in filtered list)
   */
  private async selectItem(index: number): Promise<void> {
    const displayItems = this.filteredItems;
    if (index < 0 || index >= displayItems.length) {
      return;
    }

    this.selectedIndex = index;
    this.selectedItem = displayItems[index];

    // Re-render list to update selection style
    this.renderHistoryList();

    // Update toolbar
    const itemInfo = this.querySelector('#item-info');
    const itemType = this.querySelector('#item-type');
    if (itemInfo && this.selectedItem) {
      itemInfo.textContent = this.getItemInfo(this.selectedItem);
    }
    if (itemType && this.selectedItem) {
      itemType.textContent = this.selectedItem.type === 'text' ? 'Text' : 'Image';
    }

    // Update preview container
    const previewContainer = this.querySelector('#preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = this.renderPreview();
    }

    // Load preview content
    this.loadPreviewContent();
  }

  /**
   * Load preview content for the selected item
   */
  private async loadPreviewContent(): Promise<void> {
    if (!this.selectedItem) {
      return;
    }

    try {
      if (this.selectedItem.type === 'text') {
        const content = await this.api.getTextContent(this.selectedItem.id);
        const textarea = this.querySelector('#preview-textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = content;
        }
      } else {
        const dataUrl = await this.api.getImageData(this.selectedItem.id);
        const img = this.querySelector('#preview-image') as HTMLImageElement;
        if (img) {
          img.src = dataUrl;
        }
      }
    } catch (error) {
      console.error('Failed to load preview content:', error);
      this.showErrorMessage('Failed to load preview');
    }
  }

  /**
   * Delete an item (index is from filtered list)
   */
  private async deleteItem(index: number): Promise<void> {
    const displayItems = this.filteredItems;
    const item = displayItems[index];
    if (!item) return;

    try {
      await this.api.deleteClipboardHistoryItem(item.id);

      // Find the actual index in the original items array
      const actualIndex = this.items.findIndex(i => i.id === item.id);
      if (actualIndex >= 0) {
        this.items.splice(actualIndex, 1);
      }

      // Clear search to reset filtering
      this.searchQuery = '';

      // Update selection
      if (this.items.length > 0) {
        // Try to select the item at the same position, or the last item
        const newIndex = Math.min(index, this.items.length - 1);
        this.selectedIndex = newIndex;
        this.selectedItem = this.items[newIndex];
      } else {
        this.selectedIndex = -1;
        this.selectedItem = null;
      }

      // Re-render
      this.render();
    } catch (error) {
      console.error('Failed to delete item:', error);
      this.showErrorMessage('Failed to delete item');
    }
  }

  /**
   * Clear all items
   */
  private async clearAll(): Promise<void> {
    const confirmed = confirm('Are you sure you want to clear all clipboard history?');
    if (!confirmed) return;

    try {
      await this.api.clearClipboardHistory();

      // Clear local state
      this.items = [];
      this.selectedItem = null;
      this.selectedIndex = -1;

      // Re-render
      this.render();
    } catch (error) {
      console.error('Failed to clear clipboard history:', error);
      this.showErrorMessage('Failed to clear clipboard history');
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
   * Handle search input changes
   */
  private handleSearch(): void {
    const displayItems = this.filteredItems;

    // Reset selection to first item when search changes
    if (displayItems.length > 0) {
      this.selectedIndex = 0;
      this.selectedItem = displayItems[0];
    } else {
      this.selectedIndex = -1;
      this.selectedItem = null;
    }

    // Re-render history list and preview
    this.renderHistoryList();

    // Update toolbar
    const itemInfo = this.querySelector('#item-info');
    const itemType = this.querySelector('#item-type');
    if (itemInfo && this.selectedItem) {
      itemInfo.textContent = this.getItemInfo(this.selectedItem);
    } else if (itemInfo) {
      itemInfo.textContent = 'No item selected';
    }
    if (itemType && this.selectedItem) {
      itemType.textContent = this.selectedItem.type === 'text' ? 'Text' : 'Image';
    } else if (itemType) {
      itemType.textContent = '';
    }

    // Update preview container
    const previewContainer = this.querySelector('#preview-container');
    if (previewContainer) {
      if (this.selectedItem) {
        previewContainer.innerHTML = this.renderPreview();
        this.loadPreviewContent();
      } else {
        const hasFilteredResults = !this.noLocationConfigured && this.items.length > 0 && displayItems.length === 0 && this.searchQuery.trim() !== '';
        previewContainer.innerHTML = hasFilteredResults
          ? '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">No matching items</div>'
          : '<div class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Select an item to preview</div>';
      }
    }
  }

  /**
   * Attach keyboard handler for navigation and copy
   */
  private attachKeyboardHandler(): void {
    // Remove existing handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    this.keyboardHandler = (e: KeyboardEvent) => {
      const displayItems = this.filteredItems;
      if (displayItems.length === 0) return;

      // Allow navigation and action keys even when search input is focused
      const searchInput = this.querySelector('#search-input');
      const isNavigationKey = e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape';
      if (document.activeElement === searchInput && !isNavigationKey) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.navigateDown(displayItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigateUp(displayItems);
          break;
        case 'Enter':
          e.preventDefault();
          this.copySelectedItem();
          break;
        case 'Escape':
          // Clear search if there's a query, otherwise do nothing
          if (this.searchQuery.trim()) {
            e.preventDefault();
            this.searchQuery = '';
            const input = this.querySelector('#search-input') as HTMLInputElement;
            if (input) {
              input.value = '';
            }
            this.handleSearch();
          }
          break;
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Navigate down in the list
   */
  private navigateDown(items: ClipboardHistoryItem[]): void {
    if (this.selectedIndex < items.length - 1) {
      this.selectItem(this.selectedIndex + 1);
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Navigate up in the list
   */
  private navigateUp(items: ClipboardHistoryItem[]): void {
    if (this.selectedIndex > 0) {
      this.selectItem(this.selectedIndex - 1);
      this.scrollSelectedItemIntoView();
    }
  }

  /**
   * Scroll selected item into view
   */
  private scrollSelectedItemIntoView(): void {
    const selectedItem = this.querySelector('.history-item-container.bg-blue-50, .history-item-container.dark\\:bg-blue-900\\/20');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Copy selected item to clipboard and close window
   */
  private async copySelectedItem(): Promise<void> {
    if (!this.selectedItem) return;

    try {
      if (this.selectedItem.type === 'text') {
        const content = await this.api.getTextContent(this.selectedItem.id);
        await navigator.clipboard.writeText(content);
      } else {
        // For images, we need to use the Clipboard API with a blob
        const dataUrl = await this.api.getImageData(this.selectedItem.id);
        const blob = await this.dataUrlToBlob(dataUrl);
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
      }
      // Close window after successful copy
      this.api.closeClipboardHistoryWindow();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showErrorMessage('Failed to copy to clipboard');
    }
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
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
}

customElements.define('clipboard-history-window', ClipboardHistoryWindow);
