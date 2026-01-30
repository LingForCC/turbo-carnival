import type { ModelConfig } from '../global.d.ts';

/**
 * ModelConfigDialog Web Component
 * Modal dialog for managing model configurations
 */
export class ModelConfigDialog extends HTMLElement {
  private modelConfigs: ModelConfig[] = [];
  private mode: 'list' | 'add' | 'edit' = 'list';
  private editingModelConfig?: ModelConfig;

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    await this.loadModelConfigs();
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">Model Configurations</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                Manage model settings for AI agents
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Content Area -->
          <div class="p-6">
            ${this.mode === 'list' ? this.renderModelConfigList() : this.renderModelConfigForm()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
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
          Add Model Configuration
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
    const isEdit = this.mode === 'edit';
    const config = this.editingModelConfig;

    return `
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 m-0">
        ${isEdit ? 'Edit Model Configuration' : 'Add New Model Configuration'}
      </h3>

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
          <button type="button" id="cancel-form-btn"
                  class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
            Cancel
          </button>
          <button type="submit"
                  class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
            ${isEdit ? 'Update Model Configuration' : 'Add Model Configuration'}
          </button>
        </div>
      </form>
    `;
  }

  private attachEventListeners(): void {
    // Close button - clone and replace pattern
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Add model config button
    const addModelConfigBtn = this.querySelector('#add-model-config-btn');
    if (addModelConfigBtn) {
      const newBtn = addModelConfigBtn.cloneNode(true);
      addModelConfigBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddForm());
    }

    // Form submit - clone and replace pattern
    const form = this.querySelector('#model-config-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Cancel form button - must be attached AFTER form cloning
    const cancelFormBtn = this.querySelector('#cancel-form-btn');
    if (cancelFormBtn) {
      const newBtn = cancelFormBtn.cloneNode(true);
      cancelFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Edit buttons - clone and replace pattern
    this.querySelectorAll('.edit-model-config-btn').forEach(btn => {
      const configId = btn.getAttribute('data-model-config-id');
      if (!configId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showEditForm(configId));
    });

    // Delete buttons - clone and replace pattern
    this.querySelectorAll('.delete-model-config-btn').forEach(btn => {
      const configId = btn.getAttribute('data-model-config-id');
      if (!configId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.deleteModelConfig(configId));
    });
  }

  private async loadModelConfigs(): Promise<void> {
    if (window.electronAPI) {
      try {
        this.modelConfigs = await window.electronAPI.getModelConfigs();
      } catch (error) {
        console.error('Failed to load model configs:', error);
      }
    }
  }

  private showList(): void {
    this.mode = 'list';
    this.editingModelConfig = undefined;
    this.render();
  }

  private showAddForm(): void {
    this.mode = 'add';
    this.editingModelConfig = undefined;
    this.render();
  }

  private showEditForm(configId: string): void {
    const config = this.modelConfigs.find(c => c.id === configId);
    if (!config) return;

    this.mode = 'edit';
    this.editingModelConfig = config;
    this.render();
  }

  private async handleSubmit(event: Event): Promise<void> {
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
      if (window.electronAPI) {
        if (this.mode === 'edit' && this.editingModelConfig) {
          this.modelConfigs = await window.electronAPI.updateModelConfig(this.editingModelConfig.id, newModelConfig);
        } else {
          this.modelConfigs = await window.electronAPI.addModelConfig(newModelConfig);
        }
        this.showList();
      }
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
      if (window.electronAPI) {
        this.modelConfigs = await window.electronAPI.removeModelConfig(id);
        this.render();
      }
    } catch (error: any) {
      alert(`Failed to delete model configuration: ${error.message}`);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('model-config-dialog-close', {
      bubbles: false,
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

// Register the custom element
customElements.define('model-config-dialog', ModelConfigDialog);
