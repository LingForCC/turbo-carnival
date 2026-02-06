import { getSettingsManagementAPI } from '../api/settings-management';
import type { AppSettings } from '../types/settings-management';

/**
 * SettingsDialog Web Component
 * Modal dialog for app settings including notepad configuration
 */
export class SettingsDialog extends HTMLElement {
  private settings: AppSettings | null = null;
  private api = getSettingsManagementAPI();

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    await this.loadSettings();
    this.render();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await this.api.getSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { theme: 'light', notepadSaveLocation: '' };
    }
  }

  private render(): void {
    if (!this.settings) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    const notepadLocation = this.settings.notepadSaveLocation || '';

    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">App Settings</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                Configure application preferences
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-6">
            <!-- Notepad Save Location -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="notepad-location">
                Notepad Save Location
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  id="notepad-location-input"
                  readonly
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                  placeholder="Not configured"
                  value="${this.escapeHtml(notepadLocation)}"
                >
                <button
                  id="browse-notepad-btn"
                  class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer border-0"
                >
                  Browse...
                </button>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                If not configured, notepad content will not be saved.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              id="cancel-btn"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Cancel button
    const cancelBtn = this.querySelector('#cancel-btn');
    if (cancelBtn) {
      const newBtn = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Browse button for notepad location
    const browseBtn = this.querySelector('#browse-notepad-btn');
    if (browseBtn) {
      const newBtn = browseBtn.cloneNode(true);
      browseBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.browseNotepadLocation());
    }
  }

  private async browseNotepadLocation(): Promise<void> {
    try {
      // Use the settings API to open folder dialog
      const location = await this.api.openFolderDialog();
      if (location) {
        // Update settings
        await this.api.updateSettings({ notepadSaveLocation: location });
        this.settings = { ...this.settings!, notepadSaveLocation: location };

        // Update input field
        const input = this.querySelector('#notepad-location-input') as HTMLInputElement;
        if (input) {
          input.value = location;
        }
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('settings-dialog-close', {
      bubbles: true,
      composed: true
    }));
    this.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('settings-dialog', SettingsDialog);

// Factory function to create and open the dialog
export function openSettingsDialog(): SettingsDialog {
  const dialog = document.createElement('settings-dialog') as SettingsDialog;
  document.body.appendChild(dialog);
  return dialog;
}
