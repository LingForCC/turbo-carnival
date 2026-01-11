import type { APIKey } from '../global.d.ts';

/**
 * APIKeysDialog Web Component
 * Modal dialog for managing API keys
 */
export class APIKeysDialog extends HTMLElement {
  private apiKeys: APIKey[] = [];

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    await this.loadAPIKeys();
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 m-0">API Keys</h2>
              <p class="text-sm text-gray-500 mt-1 mb-0">
                Manage API keys for OpenAI-compatible endpoints
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- API Keys List -->
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide m-0">
                Saved Keys
              </h3>
              <button id="add-key-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium cursor-pointer border-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Key
              </button>
            </div>

            <div id="keys-list" class="space-y-2">
              ${this.renderKeysList()}
            </div>

            <!-- Add Key Form (hidden by default) -->
            <div id="add-key-form" class="hidden mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 class="text-sm font-medium text-gray-700 mb-3 m-0">Add New API Key</h4>
              <form id="api-key-form" class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="key-name">
                    Name <span class="text-red-500">*</span>
                  </label>
                  <input type="text" id="key-name" name="name" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="e.g., openai-main, local-llm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="key-value">
                    API Key <span class="text-red-500">*</span>
                  </label>
                  <input type="password" id="key-value" name="apiKey" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="sk-...">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="key-baseurl">
                    Base URL (Optional)
                  </label>
                  <input type="text" id="key-baseurl" name="baseURL"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="https://api.openai.com/v1">
                  <p class="text-xs text-gray-500 mt-1 mb-0">
                    Leave empty to use OpenAI's default endpoint
                  </p>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                  <button type="button" id="cancel-form-btn"
                          class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border-0">
                    Cancel
                  </button>
                  <button type="submit"
                          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer border-0">
                    Save Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderKeysList(): string {
    if (this.apiKeys.length === 0) {
      return `
        <p class="text-sm text-gray-400 text-center py-8 m-0">
          No API keys yet. Click "Add Key" to create one.
        </p>
      `;
    }

    return this.apiKeys.map(key => `
      <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${this.escapeHtml(key.name)}</span>
            <span class="text-xs text-gray-400">•</span>
            <span class="text-xs text-gray-500 truncate">
              ${this.escapeHtml(key.baseURL || 'OpenAI Default')}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5 m-0">
            Created: ${new Date(key.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button class="delete-key-btn p-1.5 hover:bg-red-100 rounded cursor-pointer border-0 bg-transparent"
                data-key-name="${this.escapeHtml(key.name)}" title="Delete key">
          <svg class="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Add key button
    const addKeyBtn = this.querySelector('#add-key-btn');
    if (addKeyBtn) {
      const newBtn = addKeyBtn.cloneNode(true);
      addKeyBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddForm());
    }

    // Cancel form button
    const cancelFormBtn = this.querySelector('#cancel-form-btn');
    if (cancelFormBtn) {
      const newBtn = cancelFormBtn.cloneNode(true);
      cancelFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.hideAddForm());
    }

    // Form submit
    const form = this.querySelector('#api-key-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Delete buttons
    this.querySelectorAll('.delete-key-btn').forEach(btn => {
      const keyName = btn.getAttribute('data-key-name');
      if (!keyName) return;

      btn.addEventListener('click', () => this.deleteKey(keyName));
    });
  }

  private async loadAPIKeys(): Promise<void> {
    if (window.electronAPI) {
      try {
        this.apiKeys = await window.electronAPI.getAPIKeys();
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    }
  }

  private showAddForm(): void {
    const form = this.querySelector('#add-key-form');
    if (form) {
      form.classList.remove('hidden');
    }
  }

  private hideAddForm(): void {
    const form = this.querySelector('#add-key-form');
    if (form) {
      form.classList.add('hidden');
    }
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const newKey: APIKey = {
      name: formData.get('name') as string,
      apiKey: formData.get('apiKey') as string,
      baseURL: formData.get('baseURL') as string || undefined,
      createdAt: Date.now(),
    };

    try {
      if (window.electronAPI) {
        this.apiKeys = await window.electronAPI.addAPIKey(newKey);
        this.render();
      }
    } catch (error: any) {
      alert(`Failed to add API key: ${error.message}`);
    }
  }

  private async deleteKey(name: string): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete the API key "${name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      if (window.electronAPI) {
        this.apiKeys = await window.electronAPI.removeAPIKey(name);
        this.render();
      }
    } catch (error: any) {
      alert(`Failed to delete API key: ${error.message}`);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('api-keys-dialog-close', {
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

// Register the custom element
customElements.define('api-keys-dialog', APIKeysDialog);
