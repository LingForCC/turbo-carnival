import type { LLMProvider, LLMProviderType, ModelConfig } from '../../llm/types';
import { getProviderManagementAPI } from '../../llm/api';

/**
 * AISettingsPanel Web Component
 * Panel for managing LLM providers and model configurations within Settings Dialog
 */
export class AISettingsPanel extends HTMLElement {
  private providers: LLMProvider[] = [];
  private modelConfigs: ModelConfig[] = [];
  private api = getProviderManagementAPI();
  private activeTab: 'providers' | 'models' = 'providers';
  private isLoading = true;

  // Provider form state
  private providerMode: 'list' | 'add' | 'edit' = 'list';
  private editingProvider?: LLMProvider;

  // Model config form state
  private modelConfigMode: 'list' | 'add' | 'edit' = 'list';
  private editingModelConfig?: ModelConfig;

  async connectedCallback(): Promise<void> {
    this.renderLoading();
    await this.loadProviders();
    await this.loadModelConfigs();
    this.isLoading = false;
    this.render();
  }

  private renderLoading(): void {
    this.innerHTML = '<div class="p-4 text-gray-500 dark:text-gray-400">Loading...</div>';
  }

  private render(): void {
    if (this.isLoading) {
      return;
    }
    this.innerHTML = `
      <div>
        <!-- Tab Navigation -->
        <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button id="tab-providers" class="px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer border-0 ${this.activeTab === 'providers' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}">
            Providers (${this.providers.length})
          </button>
          <button id="tab-models" class="px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer border-0 ${this.activeTab === 'models' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}">
            Model Configs (${this.modelConfigs.length})
          </button>
        </div>

        <!-- Tab Content -->
        <div>
          ${this.activeTab === 'providers' ? this.renderProvidersTab() : this.renderModelsTab()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderProvidersTab(): string {
    return `
      <div>
        ${this.providerMode === 'list' ? this.renderProviderList() : this.renderProviderForm()}
      </div>
    `;
  }

  private renderProviderList(): string {
    if (this.providers.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-4">No providers configured yet</p>
          <button id="add-provider-btn" class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
            Add Your First Provider
          </button>
        </div>
      `;
    }

    return `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
          Configured Providers
        </h3>
        <button id="add-provider-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Provider
        </button>
      </div>

      <div id="providers-list" class="space-y-2">
        ${this.renderProviders()}
      </div>
    `;
  }

  private renderProviders(): string {
    return this.providers.map(provider => `
      <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
              ${provider.type === 'openai' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}">
              ${provider.type.toUpperCase()}
            </span>
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(provider.name)}</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 m-0">
            ${this.escapeHtml(provider.id)} • ${this.escapeHtml(provider.baseURL || 'Default URL')}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="edit-provider-btn p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent"
                  data-provider-id="${this.escapeHtml(provider.id)}" title="Edit provider">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-provider-btn p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer border-0 bg-transparent"
                  data-provider-id="${this.escapeHtml(provider.id)}" title="Delete provider">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  private renderProviderForm(): string {
    const isEdit = this.providerMode === 'edit';
    const provider = this.editingProvider;
    const currentType = provider?.type || 'openai';

    return `
      <div class="p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 m-0">
          ${isEdit ? 'Edit Provider' : 'Add New Provider'}
        </h4>

        <form id="provider-form" class="space-y-4">
          <!-- Provider Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-type">
              Provider Type <span class="text-red-500">*</span>
            </label>
            <select id="provider-type" name="type" required
                    ${isEdit ? 'disabled' : ''}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select type...</option>
              <option value="openai" ${currentType === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="glm" ${currentType === 'glm' ? 'selected' : ''}>GLM (Zhipu AI)</option>
            </select>
            ${isEdit ? '<input type="hidden" name="type" value="' + currentType + '">' : ''}
          </div>

          <!-- Provider ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-id">
              Provider ID <span class="text-red-500">*</span>
            </label>
            <input type="text" id="provider-id" name="id" required
                   ${isEdit ? 'readonly' : ''}
                   pattern="[a-zA-Z0-9-_]+"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., openai-main, glm-prod"
                   value="${this.escapeHtml(provider?.id || '')}">
            ${isEdit ?
              '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Provider ID cannot be changed</p>' :
              '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Letters, numbers, hyphens, and underscores only</p>'
            }
          </div>

          <!-- Display Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-name">
              Display Name <span class="text-red-500">*</span>
            </label>
            <input type="text" id="provider-name" name="name" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., OpenAI Production, GLM Development"
                   value="${this.escapeHtml(provider?.name || '')}">
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-apikey">
              API Key <span class="text-red-500">*</span>
            </label>
            <input type="password" id="provider-apikey" name="apiKey" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Enter your API key"
                   value="${this.escapeHtml(provider?.apiKey || '')}">
          </div>

          <!-- Base URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-baseurl">
              Base URL ${currentType === 'glm' ? '<span class="text-red-500">*</span>' : '(Optional)'}
            </label>
            <input type="text" id="provider-baseurl" name="baseURL"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="${currentType === 'glm' ? 'https://open.bigmodel.cn/api/paas/v4' : 'https://api.openai.com/v1'}"
                   value="${this.escapeHtml(provider?.baseURL || '')}">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              ${currentType === 'openai' ?
                'Leave empty to use OpenAI\'s default endpoint' :
                'Required for GLM providers'}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="cancel-provider-form-btn"
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
              Cancel
            </button>
            <button type="submit"
                    class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
              ${isEdit ? 'Update Provider' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private renderModelsTab(): string {
    return `
      <div>
        ${this.modelConfigMode === 'list' ? this.renderModelConfigList() : this.renderModelConfigForm()}
      </div>
    `;
  }

  private renderModelConfigList(): string {
    if (this.modelConfigs.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-4">No model configurations yet</p>
          <button id="add-model-config-btn" class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
            Add Your First Model Configuration
          </button>
        </div>
      `;
    }

    return `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
          Configured Models
        </h3>
        <button id="add-model-config-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Model Config
        </button>
      </div>

      <div id="model-configs-list" class="space-y-2">
        ${this.renderModelConfigs()}
      </div>
    `;
  }

  private renderModelConfigs(): string {
    return this.modelConfigs.map(config => `
      <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(config.name)}</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 m-0">
            ${this.escapeHtml(config.id)} • ${this.escapeHtml(config.model)}
            ${config.temperature !== undefined ? ` • Temp: ${config.temperature}` : ''}
            ${config.maxTokens ? ` • Max: ${config.maxTokens}` : ''}
            ${config.topP !== undefined ? ` • TopP: ${config.topP}` : ''}
            ${config.extra && Object.keys(config.extra).length > 0 ? ' • Extra: ✓' : ''}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="edit-model-config-btn p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent"
                  data-model-config-id="${this.escapeHtml(config.id)}" title="Edit model configuration">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-model-config-btn p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer border-0 bg-transparent"
                  data-model-config-id="${this.escapeHtml(config.id)}" title="Delete model configuration">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  private renderModelConfigForm(): string {
    const isEdit = this.modelConfigMode === 'edit';
    const config = this.editingModelConfig;

    return `
      <div class="p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 m-0">
          ${isEdit ? 'Edit Model Configuration' : 'Add New Model Configuration'}
        </h4>

        <form id="model-config-form" class="space-y-4">
          <!-- Model Config ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-id">
              Model Configuration ID <span class="text-red-500">*</span>
            </label>
            <input type="text" id="model-config-id" name="id" required
                   ${isEdit ? 'readonly' : ''}
                   pattern="[a-zA-Z0-9-_]+"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., gpt4-creative, claude-balanced"
                   value="${this.escapeHtml(config?.id || '')}">
            ${isEdit ?
              '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Model Configuration ID cannot be changed</p>' :
              '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Letters, numbers, hyphens, and underscores only</p>'
            }
          </div>

          <!-- Display Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-name">
              Display Name <span class="text-red-500">*</span>
            </label>
            <input type="text" id="model-config-name" name="name" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., GPT-4 Creative, Claude Balanced"
                   value="${this.escapeHtml(config?.name || '')}">
          </div>

          <!-- Model -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-model">
              Model <span class="text-red-500">*</span>
            </label>
            <input type="text" id="model-config-model" name="model" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., gpt-4, claude-3.5-sonnet"
                   value="${this.escapeHtml(config?.model || '')}">
          </div>

          <!-- Provider Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-type">
              Provider Type <span class="text-red-500">*</span>
            </label>
            <select id="model-config-type" name="type" required
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select provider type...</option>
              <option value="openai" ${config?.type === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="glm" ${config?.type === 'glm' ? 'selected' : ''}>GLM (Zhipu AI)</option>
              <option value="azure" ${config?.type === 'azure' ? 'selected' : ''}>Azure OpenAI</option>
              <option value="custom" ${config?.type === 'custom' ? 'selected' : ''}>Custom Provider</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Select the provider type for this model configuration
            </p>
          </div>

          <!-- Temperature -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-temperature">
              Temperature (Optional)
            </label>
            <input type="number" id="model-config-temperature" name="temperature" min="0" max="2" step="0.1"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="0.7"
                   value="${config?.temperature !== undefined ? config.temperature : ''}">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Controls randomness: 0 = focused, 2 = creative (default: 0.7)
            </p>
          </div>

          <!-- Max Tokens -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-max-tokens">
              Max Tokens (Optional)
            </label>
            <input type="number" id="model-config-max-tokens" name="maxTokens" min="1"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., 4096"
                   value="${config?.maxTokens || ''}">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Maximum tokens in the response (leave empty for model default)
            </p>
          </div>

          <!-- Top P -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-top-p">
              Top P (Optional)
            </label>
            <input type="number" id="model-config-top-p" name="topP" min="0" max="1" step="0.1"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="1.0"
                   value="${config?.topP !== undefined ? config.topP : ''}">
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Nucleus sampling: 0 = focused, 1 = diverse (default: 1.0)
            </p>
          </div>

          <!-- Extra Properties -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-extra">
              Extra Properties (Optional)
            </label>
            <textarea id="model-config-extra" name="extra" rows="3"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder='{"thinking": true}'>${this.escapeHtml(config?.extra ? JSON.stringify(config.extra, null, 2) : '')}</textarea>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Model-specific properties as JSON (e.g., thinking mode for GPT-5.2)
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="cancel-model-config-form-btn"
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
              Cancel
            </button>
            <button type="submit"
                    class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
              ${isEdit ? 'Update Model Configuration' : 'Add Model Configuration'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Tab buttons
    const tabProviders = this.querySelector('#tab-providers');
    if (tabProviders) {
      const newTab = tabProviders.cloneNode(true);
      tabProviders.replaceWith(newTab);
      (newTab as HTMLElement).addEventListener('click', () => this.switchTab('providers'));
    }

    const tabModels = this.querySelector('#tab-models');
    if (tabModels) {
      const newTab = tabModels.cloneNode(true);
      tabModels.replaceWith(newTab);
      (newTab as HTMLElement).addEventListener('click', () => this.switchTab('models'));
    }

    if (this.activeTab === 'providers') {
      this.attachProviderListeners();
    } else {
      this.attachModelConfigListeners();
    }
  }

  private attachProviderListeners(): void {
    // Add provider button
    const addProviderBtn = this.querySelector('#add-provider-btn');
    if (addProviderBtn) {
      const newBtn = addProviderBtn.cloneNode(true);
      addProviderBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddProviderForm());
    }

    // Provider type change - update placeholder for base URL
    const typeSelect = this.querySelector('#provider-type');
    if (typeSelect && this.providerMode !== 'edit') {
      const newSelect = typeSelect.cloneNode(true);
      typeSelect.replaceWith(newSelect);
      (newSelect as HTMLSelectElement).addEventListener('change', () => {
        const selectedType = (newSelect as HTMLSelectElement).value as LLMProviderType;
        this.updateBaseURLPlaceholder(selectedType);
      });
    }

    // Form submit
    const form = this.querySelector('#provider-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleProviderSubmit(e));
    }

    // Cancel form button
    const cancelFormBtn = this.querySelector('#cancel-provider-form-btn');
    if (cancelFormBtn) {
      const newBtn = cancelFormBtn.cloneNode(true);
      cancelFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showProviderList());
    }

    // Edit buttons
    this.querySelectorAll('.edit-provider-btn').forEach(btn => {
      const providerId = btn.getAttribute('data-provider-id');
      if (!providerId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showEditProviderForm(providerId));
    });

    // Delete buttons
    this.querySelectorAll('.delete-provider-btn').forEach(btn => {
      const providerId = btn.getAttribute('data-provider-id');
      if (!providerId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.deleteProvider(providerId));
    });
  }

  private attachModelConfigListeners(): void {
    // Add model config button
    const addModelConfigBtn = this.querySelector('#add-model-config-btn');
    if (addModelConfigBtn) {
      const newBtn = addModelConfigBtn.cloneNode(true);
      addModelConfigBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddModelConfigForm());
    }

    // Form submit
    const form = this.querySelector('#model-config-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleModelConfigSubmit(e));
    }

    // Cancel form button
    const cancelFormBtn = this.querySelector('#cancel-model-config-form-btn');
    if (cancelFormBtn) {
      const newBtn = cancelFormBtn.cloneNode(true);
      cancelFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showModelConfigList());
    }

    // Edit buttons
    this.querySelectorAll('.edit-model-config-btn').forEach(btn => {
      const configId = btn.getAttribute('data-model-config-id');
      if (!configId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showEditModelConfigForm(configId));
    });

    // Delete buttons
    this.querySelectorAll('.delete-model-config-btn').forEach(btn => {
      const configId = btn.getAttribute('data-model-config-id');
      if (!configId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.deleteModelConfig(configId));
    });
  }

  private switchTab(tab: 'providers' | 'models'): void {
    this.activeTab = tab;
    this.providerMode = 'list';
    this.modelConfigMode = 'list';
    this.render();
  }

  private updateBaseURLPlaceholder(providerType: LLMProviderType): void {
    const baseURLInput = this.querySelector('#provider-baseurl') as HTMLInputElement;
    const baseURLLabel = this.querySelector('label[for="provider-baseurl"]');
    if (!baseURLInput) return;

    if (providerType === 'glm') {
      baseURLInput.placeholder = 'https://open.bigmodel.cn/api/paas/v4';
      if (baseURLLabel) {
        baseURLLabel.innerHTML = 'Base URL <span class="text-red-500">*</span>';
      }
    } else {
      baseURLInput.placeholder = 'https://api.openai.com/v1';
      if (baseURLLabel) {
        baseURLLabel.innerHTML = 'Base URL (Optional)';
      }
    }
  }

  private async loadProviders(): Promise<void> {
    try {
      this.providers = await this.api.getProviders();
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }

  private async loadModelConfigs(): Promise<void> {
    try {
      this.modelConfigs = await this.api.getModelConfigs();
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  }

  private showProviderList(): void {
    this.providerMode = 'list';
    this.editingProvider = undefined;
    this.render();
  }

  private showAddProviderForm(): void {
    this.providerMode = 'add';
    this.editingProvider = undefined;
    this.render();
  }

  private showEditProviderForm(providerId: string): void {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return;

    this.providerMode = 'edit';
    this.editingProvider = provider;
    this.render();
  }

  private async handleProviderSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const newProvider: LLMProvider = {
      id: formData.get('id') as string,
      type: formData.get('type') as LLMProviderType,
      name: formData.get('name') as string,
      apiKey: formData.get('apiKey') as string,
      baseURL: formData.get('baseURL') as string || undefined,
      createdAt: this.editingProvider?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (this.providerMode === 'edit' && this.editingProvider) {
        this.providers = await this.api.updateProvider(this.editingProvider.id, newProvider);
      } else {
        this.providers = await this.api.addProvider(newProvider);
      }
      this.showProviderList();
    } catch (error: any) {
      alert(`Failed to save provider: ${error.message}`);
    }
  }

  private async deleteProvider(id: string): Promise<void> {
    const provider = this.providers.find(p => p.id === id);
    if (!provider) return;

    const confirmed = confirm(
      `Are you sure you want to delete the provider "${provider.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      this.providers = await this.api.removeProvider(id);
      this.render();
    } catch (error: any) {
      alert(`Failed to delete provider: ${error.message}`);
    }
  }

  private showModelConfigList(): void {
    this.modelConfigMode = 'list';
    this.editingModelConfig = undefined;
    this.render();
  }

  private showAddModelConfigForm(): void {
    this.modelConfigMode = 'add';
    this.editingModelConfig = undefined;
    this.render();
  }

  private showEditModelConfigForm(configId: string): void {
    const config = this.modelConfigs.find(c => c.id === configId);
    if (!config) return;

    this.modelConfigMode = 'edit';
    this.editingModelConfig = config;
    this.render();
  }

  private async handleModelConfigSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Parse extra properties
    let extra: Record<string, any> | undefined = undefined;
    const extraStr = formData.get('extra') as string;
    if (extraStr && extraStr.trim()) {
      try {
        extra = JSON.parse(extraStr);
      } catch (err) {
        alert('Invalid JSON in Extra Properties field. Please check your syntax.');
        return;
      }
    }

    const newModelConfig: ModelConfig = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      model: formData.get('model') as string,
      type: formData.get('type') as any,
      temperature: formData.get('temperature') ? parseFloat(formData.get('temperature') as string) : undefined,
      maxTokens: formData.get('maxTokens') ? parseInt(formData.get('maxTokens') as string) : undefined,
      topP: formData.get('topP') ? parseFloat(formData.get('topP') as string) : undefined,
      extra: extra,
      createdAt: this.editingModelConfig?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (this.modelConfigMode === 'edit' && this.editingModelConfig) {
        this.modelConfigs = await this.api.updateModelConfig(this.editingModelConfig.id, newModelConfig);
      } else {
        this.modelConfigs = await this.api.addModelConfig(newModelConfig);
      }
      this.showModelConfigList();
    } catch (error: any) {
      alert(`Failed to save model configuration: ${error.message}`);
    }
  }

  private async deleteModelConfig(id: string): Promise<void> {
    const config = this.modelConfigs.find(c => c.id === id);
    if (!config) return;

    const confirmed = confirm(
      `Are you sure you want to delete the model configuration "${config.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      this.modelConfigs = await this.api.removeModelConfig(id);
      this.render();
    } catch (error: any) {
      alert(`Failed to delete model configuration: ${error.message}`);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('ai-settings-panel', AISettingsPanel);
