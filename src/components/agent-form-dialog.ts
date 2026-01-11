import type { Agent } from '../global.d.ts';

/**
 * AgentFormDialog Web Component
 * Modal dialog for creating and editing agents
 */
export class AgentFormDialog extends HTMLElement {
  private mode: 'create' | 'edit' = 'create';
  private agent: Agent | null = null;
  private form: HTMLFormElement | null = null;

  constructor() {
    super();
  }

  connectedCallback(): void {
    // Parse mode from attribute
    this.mode = this.getAttribute('mode') === 'edit' ? 'edit' : 'create';

    // Parse agent data if editing
    const agentData = this.dataset.agent;
    if (agentData) {
      try {
        this.agent = JSON.parse(agentData);
      } catch (error) {
        console.error('Failed to parse agent data:', error);
      }
    }

    this.render();
    this.attachEventListeners();
    this.loadAPIKeys();
  }

  private render(): void {
    const isEdit = this.mode === 'edit';
    const agent = this.agent;

    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 m-0">
                ${isEdit ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <p class="text-sm text-gray-500 mt-1 mb-0">
                ${isEdit ? 'Update agent configuration and settings' : 'Configure your AI agent'}
              </p>
            </div>
            <button id="close-x-btn" class="p-1 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form id="agent-form" class="p-6 space-y-6">
            <!-- Basic Info -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Basic Information
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-name">
                  Agent Name <span class="text-red-500">*</span>
                </label>
                <input type="text" id="agent-name" name="name" required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="e.g., Code Review Assistant"
                       value="${this.escapeHtml(agent?.name || '')}"
                       ${isEdit ? 'readonly' : ''}>
                ${isEdit ?
                  '<p class="text-xs text-gray-400 mt-1">Agent name cannot be changed</p>' :
                  ''
                }
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-type">
                  Agent Type <span class="text-red-500">*</span>
                </label>
                <select id="agent-type" name="type" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select type...</option>
                  <option value="chat" ${agent?.type === 'chat' ? 'selected' : ''}>Chat</option>
                  <option value="code" ${agent?.type === 'code' ? 'selected' : ''}>Code</option>
                  <option value="assistant" ${agent?.type === 'assistant' ? 'selected' : ''}>Assistant</option>
                  <option value="reviewer" ${agent?.type === 'reviewer' ? 'selected' : ''}>Reviewer</option>
                  <option value="custom" ${agent?.type === 'custom' ? 'selected' : ''}>Custom</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-description">
                  Description <span class="text-red-500">*</span>
                </label>
                <textarea id="agent-description" name="description" required rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Brief description of what this agent does...">${this.escapeHtml(agent?.description || '')}</textarea>
              </div>
            </div>

            <!-- Configuration -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Model Configuration
              </h3>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-model">
                    Model <span class="text-red-500">*</span>
                  </label>
                  <input type="text" id="agent-model" name="model" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="e.g., claude-3.5"
                         value="${this.escapeHtml(agent?.config?.model || 'claude-3.5')}">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-temperature">
                    Temperature
                  </label>
                  <input type="number" id="agent-temperature" name="temperature"
                         min="0" max="2" step="0.1"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="0.7"
                         value="${agent?.config?.temperature || 0.7}">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-max-tokens">
                    Max Tokens
                  </label>
                  <input type="number" id="agent-max-tokens" name="maxTokens"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Optional"
                         value="${agent?.config?.maxTokens || ''}">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-top-p">
                    Top P
                  </label>
                  <input type="number" id="agent-top-p" name="topP"
                         min="0" max="1" step="0.1"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Optional"
                         value="${agent?.config?.topP || ''}">
                </div>
              </div>
            </div>

            <!-- API Configuration -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                API Configuration
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="api-key-ref">
                  API Key
                </label>
                <select id="api-key-ref" name="apiKeyRef"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No API key selected</option>
                </select>
                <div class="flex items-center gap-2 mt-1">
                  <button type="button" id="manage-keys-btn" class="text-sm text-blue-500 hover:text-blue-600 cursor-pointer border-0 bg-transparent p-0">
                    Manage API Keys
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="api-baseurl">
                  Custom Base URL (Optional)
                </label>
                <input type="text" id="api-baseurl" name="baseURL"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="https://api.openai.com/v1"
                       value="${this.escapeHtml(agent?.config?.apiConfig?.baseURL || '')}">
                <p class="text-xs text-gray-500 mt-1 mb-0">
                  Override the default API endpoint (e.g., for local LLMs or compatible services)
                </p>
              </div>
            </div>

            <!-- Prompts -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Prompts
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-system-prompt">
                  System Prompt
                </label>
                <textarea id="agent-system-prompt" name="systemPrompt" rows="4"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Instructions for the AI...">${this.escapeHtml(agent?.prompts?.system || '')}</textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="agent-user-prompt">
                  Default User Prompt
                </label>
                <textarea id="agent-user-prompt" name="userPrompt" rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Default prompt template...">${this.escapeHtml(agent?.prompts?.user || '')}</textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" id="cancel-btn"
                      class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border-0">
                Cancel
              </button>
              <button type="submit"
                      class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer border-0">
                ${isEdit ? 'Update Agent' : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.form = this.querySelector('#agent-form');
    const cancelBtn = this.querySelector('#cancel-btn');

    // Close X button
    const closeXBtn = this.querySelector('#close-x-btn');
    if (closeXBtn) {
      const newBtn = closeXBtn.cloneNode(true);
      closeXBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.cancel());
    }

    if (cancelBtn) {
      const newBtn = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.cancel());
    }

    if (this.form) {
      const newForm = this.form.cloneNode(true);
      this.form.replaceWith(newForm);
      this.form = newForm as HTMLFormElement;

      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Manage keys button
    const manageKeysBtn = this.querySelector('#manage-keys-btn');
    if (manageKeysBtn) {
      const newBtn = manageKeysBtn.cloneNode(true);
      manageKeysBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openAPIKeysDialog());
    }
  }

  private handleSubmit(event: Event): void {
    event.preventDefault();

    if (!this.form) return;

    const formData = new FormData(this.form);

    // Build agent object from form data
    const agent: Agent = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      config: {
        model: formData.get('model') as string,
        temperature: parseFloat(formData.get('temperature') as string) || 0.7,
        ...(formData.get('maxTokens') && { maxTokens: parseInt(formData.get('maxTokens') as string) }),
        ...(formData.get('topP') && { topP: parseFloat(formData.get('topP') as string) }),
        ...(formData.get('apiKeyRef') || formData.get('baseURL') ? {
          apiConfig: {
            ...(formData.get('apiKeyRef') && { apiKeyRef: formData.get('apiKeyRef') as string }),
            ...(formData.get('baseURL') && { baseURL: formData.get('baseURL') as string }),
          }
        } : {}),
      },
      prompts: {
        ...(formData.get('systemPrompt') && { system: formData.get('systemPrompt') as string }),
        ...(formData.get('userPrompt') && { user: formData.get('userPrompt') as string }),
      },
      history: this.agent?.history || [],
      settings: this.agent?.settings || {},
    };

    // Emit submit event with agent data
    this.dispatchEvent(new CustomEvent('agent-form-submit', {
      detail: { agent },
      bubbles: true,
      composed: true
    }));
  }

  private cancel(): void {
    this.dispatchEvent(new CustomEvent('agent-form-cancel', {
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

  private async loadAPIKeys(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      const apiKeys = await window.electronAPI.getAPIKeys();
      const select = this.querySelector('#api-key-ref') as HTMLSelectElement;
      if (!select) return;

      // Get current value
      const currentValue = this.agent?.config?.apiConfig?.apiKeyRef || '';

      // Populate options
      select.innerHTML = `
        <option value="">No API key selected</option>
        ${apiKeys.map(key => `
          <option value="${this.escapeHtml(key.name)}" ${key.name === currentValue ? 'selected' : ''}>
            ${this.escapeHtml(key.name)} ${key.baseURL ? `(${this.escapeHtml(key.baseURL)})` : ''}
          </option>
        `).join('')}
      `;
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }

  private openAPIKeysDialog(): void {
    const dialog = document.createElement('api-keys-dialog');
    document.body.appendChild(dialog);

    dialog.addEventListener('api-keys-dialog-close', async () => {
      dialog.remove();
      // Reload API keys after dialog closes
      await this.loadAPIKeys();
    });
  }
}

// Register the custom element
customElements.define('agent-form-dialog', AgentFormDialog);
