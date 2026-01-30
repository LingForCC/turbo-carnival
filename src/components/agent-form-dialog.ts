import type { Agent, ModelConfig } from '../global.d.ts';

/**
 * AgentFormDialog Web Component
 * Modal dialog for creating and editing agents
 */
export class AgentFormDialog extends HTMLElement {
  private mode: 'create' | 'edit' = 'create';
  private agent: Agent | null = null;
  private form: HTMLFormElement | null = null;
  private modelConfigs: ModelConfig[] = [];
  private selectedModelConfig?: ModelConfig;

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
    this.loadProviders();
    this.loadModelConfigs();
  }

  private render(): void {
    const isEdit = this.mode === 'edit';
    const agent = this.agent;

    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">
                ${isEdit ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                ${isEdit ? 'Update agent configuration and settings' : 'Configure your AI agent'}
              </p>
            </div>
            <button id="close-x-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form id="agent-form" class="p-6 space-y-6">
            <!-- Basic Info -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Basic Information
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="agent-name">
                  Agent Name <span class="text-red-500">*</span>
                </label>
                <input type="text" id="agent-name" name="name" required
                       class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="e.g., Code Review Assistant"
                       value="${this.escapeHtml(agent?.name || '')}"
                       ${isEdit ? 'readonly' : ''}>
                ${isEdit ?
                  '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Agent name cannot be changed</p>' :
                  ''
                }
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="agent-type">
                  Agent Type <span class="text-red-500">*</span>
                </label>
                <select id="agent-type" name="type" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select type...</option>
                  <option value="chat" ${agent?.type === 'chat' ? 'selected' : ''}>Chat</option>
                  <option value="code" ${agent?.type === 'code' ? 'selected' : ''}>Code</option>
                  <option value="assistant" ${agent?.type === 'assistant' ? 'selected' : ''}>Assistant</option>
                  <option value="reviewer" ${agent?.type === 'reviewer' ? 'selected' : ''}>Reviewer</option>
                  <option value="app" ${agent?.type === 'app' ? 'selected' : ''}>App</option>
                  <option value="custom" ${agent?.type === 'custom' ? 'selected' : ''}>Custom</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="agent-description">
                  Description <span class="text-red-500">*</span>
                </label>
                <textarea id="agent-description" name="description" required rows="3"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Brief description of what this agent does...">${this.escapeHtml(agent?.description || '')}</textarea>
              </div>
            </div>

            <!-- Configuration -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Model Configuration
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="model-config-ref">
                  Model Configuration
                </label>
                <select id="model-config-ref" name="modelId"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select a model configuration...</option>
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
                  Choose a pre-configured model or
                  <a href="#" id="manage-models-link" class="text-blue-500 dark:text-blue-400 hover:underline">manage models</a>
                </p>
              </div>

              <!-- Model details (shown when a model is selected) -->
              <div id="model-details" class="hidden p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-sm">
                  <div class="grid grid-cols-2 gap-2">
                    <div><strong>Model:</strong> <span id="detail-model" class="text-gray-900 dark:text-gray-100"></span></div>
                    <div><strong>Temperature:</strong> <span id="detail-temperature" class="text-gray-900 dark:text-gray-100"></span></div>
                    <div><strong>Max Tokens:</strong> <span id="detail-max-tokens" class="text-gray-900 dark:text-gray-100"></span></div>
                    <div><strong>Top P:</strong> <span id="detail-top-p" class="text-gray-900 dark:text-gray-100"></span></div>
                  </div>
                  <div id="detail-extra-container" class="hidden mt-2">
                    <strong>Extra Properties:</strong>
                    <pre id="detail-extra" class="text-xs bg-white dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-gray-900 dark:text-gray-100"></pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- LLM Provider -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                LLM Provider
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="provider-ref">
                  Provider
                </label>
                <select id="provider-ref" name="providerId"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No provider selected</option>
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
                  Select an LLM provider for this agent
                </p>
              </div>
            </div>

            <!-- Prompts -->
            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Prompts
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="agent-system-prompt">
                  System Prompt
                </label>
                <textarea id="agent-system-prompt" name="systemPrompt" rows="4"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Instructions for the AI...">${this.escapeHtml(agent?.prompts?.system || '')}</textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="agent-user-prompt">
                  Default User Prompt
                </label>
                <textarea id="agent-user-prompt" name="userPrompt" rows="3"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Default prompt template...">${this.escapeHtml(agent?.prompts?.user || '')}</textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" id="cancel-btn"
                      class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                Cancel
              </button>
              <button type="submit"
                      class="px-6 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
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

    // Close X button
    const closeXBtn = this.querySelector('#close-x-btn');
    if (closeXBtn) {
      const newBtn = closeXBtn.cloneNode(true);
      closeXBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.cancel());
    }

    // Form submit (must be done before attaching listeners to buttons inside the form)
    if (this.form) {
      const newForm = this.form.cloneNode(true);
      this.form.replaceWith(newForm);
      this.form = newForm as HTMLFormElement;

      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Cancel button (must be attached AFTER form cloning since it's inside the form)
    const cancelBtn = this.querySelector('#cancel-btn');
    if (cancelBtn) {
      const newBtn = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.cancel());
    }

    // Model config dropdown change listener
    const modelConfigSelect = this.querySelector('#model-config-ref');
    if (modelConfigSelect) {
      const newSelect = modelConfigSelect.cloneNode(true);
      modelConfigSelect.replaceWith(newSelect);
      (newSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        this.onModelConfigChange(select.value);
      });
    }

    // Manage models link
    const manageModelsLink = this.querySelector('#manage-models-link');
    if (manageModelsLink) {
      const newLink = manageModelsLink.cloneNode(true);
      manageModelsLink.replaceWith(newLink);
      (newLink as HTMLElement).addEventListener('click', (e) => {
        e.preventDefault();
        this.openModelConfigDialog();
      });
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
        ...(formData.get('modelId') && { modelId: formData.get('modelId') as string }),
        ...(formData.get('providerId') && { providerId: formData.get('providerId') as string }),
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

  private async loadProviders(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      const providers = await window.electronAPI.getProviders();
      const select = this.querySelector('#provider-ref') as HTMLSelectElement;
      if (!select) return;

      // Get current value
      const currentValue = this.agent?.config?.providerId || '';

      // Populate options
      select.innerHTML = `
        <option value="">No provider selected</option>
        ${providers.map(provider => `
          <option value="${this.escapeHtml(provider.id)}" ${provider.id === currentValue ? 'selected' : ''} class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            ${this.escapeHtml(provider.name)} (${provider.type.toUpperCase()})
          </option>
        `).join('')}
      `;
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }

  private async loadModelConfigs(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      this.modelConfigs = await window.electronAPI.getModelConfigs();
      const select = this.querySelector('#model-config-ref') as HTMLSelectElement;
      if (!select) return;

      // Get current value
      const currentValue = this.agent?.config?.modelId || '';

      // Populate options
      select.innerHTML = `
        <option value="">Select a model configuration...</option>
        ${this.modelConfigs.map(config => `
          <option value="${this.escapeHtml(config.id)}" ${config.id === currentValue ? 'selected' : ''} class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            ${this.escapeHtml(config.name)}
          </option>
        `).join('')}
      `;

      // If editing and has a modelId selected, show the details
      if (currentValue) {
        this.onModelConfigChange(currentValue);
      }
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  }

  private onModelConfigChange(modelConfigId: string): void {
    const modelConfig = this.modelConfigs.find(c => c.id === modelConfigId);
    this.selectedModelConfig = modelConfig;

    const detailsDiv = this.querySelector('#model-details') as HTMLElement;
    if (!detailsDiv) return;

    if (!modelConfig) {
      detailsDiv.classList.add('hidden');
      return;
    }

    // Show details
    detailsDiv.classList.remove('hidden');

    // Update detail fields
    const modelSpan = this.querySelector('#detail-model');
    if (modelSpan) modelSpan.textContent = modelConfig.model;

    const tempSpan = this.querySelector('#detail-temperature');
    if (tempSpan) tempSpan.textContent = modelConfig.temperature !== undefined ? modelConfig.temperature.toString() : 'N/A';

    const maxTokensSpan = this.querySelector('#detail-max-tokens');
    if (maxTokensSpan) maxTokensSpan.textContent = modelConfig.maxTokens || 'N/A';

    const topPSpan = this.querySelector('#detail-top-p');
    if (topPSpan) topPSpan.textContent = modelConfig.topP !== undefined ? modelConfig.topP.toString() : 'N/A';

    // Handle extra properties
    const extraContainer = this.querySelector('#detail-extra-container');
    const extraPre = this.querySelector('#detail-extra');
    if (extraContainer && extraPre) {
      if (modelConfig.extra && Object.keys(modelConfig.extra).length > 0) {
        extraContainer.classList.remove('hidden');
        extraPre.textContent = JSON.stringify(modelConfig.extra, null, 2);
      } else {
        extraContainer.classList.add('hidden');
      }
    }
  }

  private openModelConfigDialog(): void {
    const dialog = document.createElement('model-config-dialog');
    document.body.appendChild(dialog);

    dialog.addEventListener('model-config-dialog-close', async () => {
      dialog.remove();
      // Reload model configs when dialog closes
      await this.loadModelConfigs();
    });
  }
}

// Register the custom element
customElements.define('agent-form-dialog', AgentFormDialog);
