import { getSettingsManagementAPI } from '../api/settings-management';
import { getProviderManagementAPI } from '../api/provider-management';
import type { AppSettings } from '../types/settings-management';
import type { LLMProvider, ModelConfig } from '../types/provider-management';

/**
 * SettingsDialog Web Component
 * Modal dialog for app settings including notepad configuration
 */
export class SettingsDialog extends HTMLElement {
  private settings: AppSettings | null = null;
  private currentTheme: 'light' | 'dark' = 'light';
  private api = getSettingsManagementAPI();
  private providerApi = getProviderManagementAPI();
  private providers: LLMProvider[] = [];
  private modelConfigs: ModelConfig[] = [];

  async connectedCallback(): Promise<void> {
    await this.loadSettings();
    await this.loadProviders();
    this.render();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await this.api.getSettings();
      this.currentTheme = this.settings.theme === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { theme: 'light', notepadSaveLocation: '' };
      this.currentTheme = 'light';
    }
  }

  private async loadProviders(): Promise<void> {
    try {
      this.providers = await this.providerApi.getProviders();
      this.modelConfigs = await this.providerApi.getModelConfigs();
    } catch (error) {
      console.error('Failed to load providers:', error);
      this.providers = [];
      this.modelConfigs = [];
    }
  }

  private render(): void {
    if (!this.settings) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    const notepadLocation = this.settings.notepadSaveLocation || '';
    const defaultProviderId = this.settings.defaultProviderId || '';
    const defaultModelConfigId = this.settings.defaultModelConfigId || '';

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
            <!-- Theme Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    ${this.currentTheme === 'light' ? 'checked' : ''}
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">Light</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    ${this.currentTheme === 'dark' ? 'checked' : ''}
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">Dark</span>
                </label>
              </div>
            </div>

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

            <!-- Quick AI Default Provider -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="default-provider">
                Quick AI Default Provider
              </label>
              <select
                id="default-provider-select"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
              >
                <option value="">-- Select Provider --</option>
                ${this.providers.map(provider =>
                  `<option value="${this.escapeHtml(provider.id)}" ${defaultProviderId === provider.id ? 'selected' : ''}>${this.escapeHtml(provider.name)}</option>`
                ).join('')}
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Default LLM provider for Quick AI conversations (Option+Q).
              </p>
            </div>

            <!-- Quick AI Default Model Config -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="default-model">
                Quick AI Default Model
              </label>
              <select
                id="default-model-select"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
              >
                <option value="">-- Select Model --</option>
                ${this.modelConfigs.map(model =>
                  `<option value="${this.escapeHtml(model.id)}" ${defaultModelConfigId === model.id ? 'selected' : ''}>${this.escapeHtml(model.name)}</option>`
                ).join('')}
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Default model configuration for Quick AI conversations.
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

    // Theme radio buttons
    const themeRadios = this.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      const newRadio = radio.cloneNode(true);
      radio.replaceWith(newRadio);
      (newRadio as HTMLElement).addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.handleThemeChange(target.value);
        }
      });
    });

    // Browse button for notepad location
    const browseBtn = this.querySelector('#browse-notepad-btn');
    if (browseBtn) {
      const newBtn = browseBtn.cloneNode(true);
      browseBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.browseNotepadLocation());
    }

    // Default provider dropdown
    const providerSelect = this.querySelector('#default-provider-select');
    if (providerSelect) {
      const newSelect = providerSelect.cloneNode(true);
      providerSelect.replaceWith(newSelect);
      (newSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleProviderChange(target.value);
      });
    }

    // Default model config dropdown
    const modelSelect = this.querySelector('#default-model-select');
    if (modelSelect) {
      const newSelect = modelSelect.cloneNode(true);
      modelSelect.replaceWith(newSelect);
      (newSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleModelConfigChange(target.value);
      });
    }
  }

  private async handleThemeChange(newTheme: string): Promise<void> {
    const theme = newTheme === 'dark' ? 'dark' : 'light';

    if (theme === this.currentTheme) {
      return; // No change
    }

    try {
      // Update settings
      await this.api.updateSettings({ theme });
      this.currentTheme = theme;

      // Apply theme immediately to DOM
      this.applyTheme();
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert the radio selection if update failed
      const radio = this.querySelector(`input[name="theme"][value="${this.currentTheme}"]`) as HTMLInputElement;
      if (radio) {
        radio.checked = true;
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

  private async handleProviderChange(providerId: string): Promise<void> {
    try {
      // Clear model config selection if provider changes
      await this.api.updateSettings({
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      });
      this.settings = {
        ...this.settings!,
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      };

      // Reset model config dropdown
      const modelSelect = this.querySelector('#default-model-select') as HTMLSelectElement;
      if (modelSelect) {
        modelSelect.value = '';
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
    }
  }

  private async handleModelConfigChange(modelConfigId: string): Promise<void> {
    try {
      await this.api.updateSettings({
        defaultModelConfigId: modelConfigId || undefined
      });
      this.settings = {
        ...this.settings!,
        defaultModelConfigId: modelConfigId || undefined
      };
    } catch (error) {
      console.error('Failed to update model config:', error);
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
