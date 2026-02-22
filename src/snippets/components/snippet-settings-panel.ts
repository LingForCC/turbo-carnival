import { getSettingsManagementAPI } from '../../settings/api';
import { registerFeatureSettingsRenderer } from '../../settings/components/settings-dialog';

/**
 * Snippet Settings Interface
 */
export interface SnippetSettings {
  saveLocation?: string;
}

/**
 * Snippet Settings Panel Web Component
 * Renders the snippets settings UI in the settings dialog
 */
export class SnippetSettingsPanel extends HTMLElement {
  private settings: SnippetSettings = {};
  private api = getSettingsManagementAPI();

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    // Try to load settings from data attribute first
    const dataSettings = this.getAttribute('data-settings');
    if (dataSettings) {
      try {
        this.settings = JSON.parse(dataSettings);
      } catch (e) {
        console.error('Failed to parse snippets settings:', e);
      }
    }

    // Also try to load from feature settings API
    try {
      const featureSettings = await this.api.getFeatureSettings<SnippetSettings>('snippets');
      this.settings = { ...this.settings, ...featureSettings };
    } catch (e) {
      console.error('Failed to load snippets feature settings:', e);
    }

    this.render();
  }

  /**
   * Set settings from parent component
   */
  set settingsData(value: SnippetSettings) {
    this.settings = value;
    if (this.isConnected) {
      this.render();
    }
  }

  private render(): void {
    const saveLocation = this.settings.saveLocation || '';

    this.innerHTML = `
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="snippet-save-location">
            Snippet Save Location
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              id="snippet-save-location-input"
              readonly
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
              placeholder="Not configured"
              value="${this.escapeHtml(saveLocation)}"
            >
            <button
              id="browse-snippet-btn"
              class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer border-0"
            >
              Browse...
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            If not configured, snippets will not be available (Option+S).
          </p>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Browse button for snippet location
    const browseBtn = this.querySelector('#browse-snippet-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => this.browseSnippetLocation());
    }
  }

  private async browseSnippetLocation(): Promise<void> {
    try {
      const location = await this.api.openFolderDialog();
      if (location) {
        // Update feature settings
        await this.api.updateFeatureSettings<SnippetSettings>('snippets', {
          saveLocation: location
        });

        // Also update legacy settings for backwards compatibility
        await this.api.updateSettings({ snippetSaveLocation: location });

        this.settings = { ...this.settings, saveLocation: location };

        // Update input field
        const input = this.querySelector('#snippet-save-location-input') as HTMLInputElement;
        if (input) {
          input.value = location;
        }
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('snippet-settings-panel', SnippetSettingsPanel);

// Register feature settings with the settings dialog
registerFeatureSettingsRenderer({
  featureId: 'snippets',
  displayName: 'Snippets',
  order: 60,
  defaults: {
    saveLocation: ''
  },
  panelTagName: 'snippet-settings-panel'
});
