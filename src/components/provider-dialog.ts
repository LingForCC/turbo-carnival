import type { LLMProvider, LLMProviderType } from '../global.d.ts';

/**
 * ProviderDialog Web Component
 * Modal dialog for managing LLM providers
 */
export class ProviderDialog extends HTMLElement {
  private providers: LLMProvider[] = [];
  private mode: 'list' | 'add' | 'edit' = 'list';
  private editingProvider?: LLMProvider;

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    await this.loadProviders();
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
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">LLM Providers</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                Manage API providers for AI agents
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
            ${this.mode === 'list' ? this.renderProviderList() : this.renderProviderForm()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
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
    const isEdit = this.mode === 'edit';
    const provider = this.editingProvider;
    const currentType = provider?.type || 'openai';

    return `
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 m-0">
        ${isEdit ? 'Edit Provider' : 'Add New Provider'}
      </h3>

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
          <button type="button" id="cancel-form-btn"
                  class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
            Cancel
          </button>
          <button type="submit"
                  class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
            ${isEdit ? 'Update Provider' : 'Add Provider'}
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

    // Add provider button
    const addProviderBtn = this.querySelector('#add-provider-btn');
    if (addProviderBtn) {
      const newBtn = addProviderBtn.cloneNode(true);
      addProviderBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddForm());
    }

    // Provider type change - update placeholder for base URL
    const typeSelect = this.querySelector('#provider-type');
    if (typeSelect && this.mode !== 'edit') {
      const newSelect = typeSelect.cloneNode(true);
      typeSelect.replaceWith(newSelect);
      (newSelect as HTMLSelectElement).addEventListener('change', () => {
        const selectedType = (newSelect as HTMLSelectElement).value as LLMProviderType;
        this.updateBaseURLPlaceholder(selectedType);
      });
    }

    // Form submit - clone and replace pattern
    const form = this.querySelector('#provider-form');
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
      (newBtn as HTMLElement).addEventListener('click', () => this.showList());
    }

    // Edit buttons - clone and replace pattern
    this.querySelectorAll('.edit-provider-btn').forEach(btn => {
      const providerId = btn.getAttribute('data-provider-id');
      if (!providerId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showEditForm(providerId));
    });

    // Delete buttons - clone and replace pattern
    this.querySelectorAll('.delete-provider-btn').forEach(btn => {
      const providerId = btn.getAttribute('data-provider-id');
      if (!providerId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.deleteProvider(providerId));
    });
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
    if (window.electronAPI) {
      try {
        this.providers = await window.electronAPI.getProviders();
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    }
  }

  private showList(): void {
    this.mode = 'list';
    this.editingProvider = undefined;
    this.render();
  }

  private showAddForm(): void {
    this.mode = 'add';
    this.editingProvider = undefined;
    this.render();
  }

  private showEditForm(providerId: string): void {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return;

    this.mode = 'edit';
    this.editingProvider = provider;
    this.render();
  }

  private async handleSubmit(event: Event): Promise<void> {
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
      if (window.electronAPI) {
        if (this.mode === 'edit' && this.editingProvider) {
          this.providers = await window.electronAPI.updateProvider(this.editingProvider.id, newProvider);
        } else {
          this.providers = await window.electronAPI.addProvider(newProvider);
        }
        this.showList();
      }
    } catch (error: any) {
      alert(`Failed to save provider: ${error.message}`);
    }
  }

  private async deleteProvider(id: string): void {
    const provider = this.providers.find(p => p.id === id);
    if (!provider) return;

    const confirmed = confirm(
      `Are you sure you want to delete the provider "${provider.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      if (window.electronAPI) {
        this.providers = await window.electronAPI.removeProvider(id);
        this.render();
      }
    } catch (error: any) {
      alert(`Failed to delete provider: ${error.message}`);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('provider-dialog-close', {
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
customElements.define('provider-dialog', ProviderDialog);
