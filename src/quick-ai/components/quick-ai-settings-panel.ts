import { getSettingsManagementAPI } from '../../settings/api';
import { getProviderManagementAPI } from '../../llm/api';
import { registerFeatureSettingsRenderer } from '../../settings/components/settings-dialog';
import type { LLMProvider, ModelConfig } from '../../llm/types';

/**
 * Quick AI Settings Interface
 */
export interface QuickAISettings {
  defaultProviderId?: string;
  defaultModelConfigId?: string;
}

/**
 * Quick AI Settings Panel Web Component
 * Renders the Quick AI settings UI in the settings dialog
 */
export class QuickAISettingsPanel extends HTMLElement {
  private settings: QuickAISettings = {};
  private api = getSettingsManagementAPI();
  private providerApi = getProviderManagementAPI();
  private providers: LLMProvider[] = [];
  private modelConfigs: ModelConfig[] = [];

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
        console.error('Failed to parse Quick AI settings:', e);
      }
    }

    // Also try to load from feature settings API
    try {
      const featureSettings = await this.api.getFeatureSettings<QuickAISettings>('quick-ai');
      this.settings = { ...this.settings, ...featureSettings };
    } catch (e) {
      console.error('Failed to load Quick AI feature settings:', e);
    }

    // Load providers and model configs
    try {
      this.providers = await this.providerApi.getProviders();
      this.modelConfigs = await this.providerApi.getModelConfigs();
    } catch (e) {
      console.error('Failed to load providers:', e);
      this.providers = [];
      this.modelConfigs = [];
    }

    this.render();
  }

  /**
   * Set settings from parent component
   */
  set settingsData(value: QuickAISettings) {
    this.settings = value;
    if (this.isConnected) {
      this.render();
    }
  }

  private render(): void {
    const defaultProviderId = this.settings.defaultProviderId || '';
    const defaultModelConfigId = this.settings.defaultModelConfigId || '';

    this.innerHTML = `
      <div class="space-y-6">
        <!-- Quick AI Default Provider -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="quick-ai-default-provider">
            Default Provider
          </label>
          <select
            id="quick-ai-default-provider-select"
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
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="quick-ai-default-model">
            Default Model
          </label>
          <select
            id="quick-ai-default-model-select"
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
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Default provider dropdown
    const providerSelect = this.querySelector('#quick-ai-default-provider-select');
    if (providerSelect) {
      (providerSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleProviderChange(target.value);
      });
    }

    // Default model config dropdown
    const modelSelect = this.querySelector('#quick-ai-default-model-select');
    if (modelSelect) {
      (modelSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleModelConfigChange(target.value);
      });
    }
  }

  private async handleProviderChange(providerId: string): Promise<void> {
    try {
      // Update feature settings
      await this.api.updateFeatureSettings<QuickAISettings>('quick-ai', {
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      });

      this.settings = {
        ...this.settings,
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      };

      // Reset model config dropdown
      const modelSelect = this.querySelector('#quick-ai-default-model-select') as HTMLSelectElement;
      if (modelSelect) {
        modelSelect.value = '';
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
    }
  }

  private async handleModelConfigChange(modelConfigId: string): Promise<void> {
    try {
      // Update feature settings
      await this.api.updateFeatureSettings<QuickAISettings>('quick-ai', {
        defaultModelConfigId: modelConfigId || undefined
      });

      this.settings = {
        ...this.settings,
        defaultModelConfigId: modelConfigId || undefined
      };
    } catch (error) {
      console.error('Failed to update model config:', error);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('quick-ai-settings-panel', QuickAISettingsPanel);

// Register feature settings with the settings dialog
registerFeatureSettingsRenderer<QuickAISettings>({
  featureId: 'quick-ai',
  displayName: 'Quick AI',
  order: 80,
  defaults: {
    defaultProviderId: undefined,
    defaultModelConfigId: undefined
  },
  panelTagName: 'quick-ai-settings-panel'
});
