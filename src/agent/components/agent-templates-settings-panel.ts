import type { AgentTemplate, AgentTemplateFeatureSettings } from '../types/agent-template';
import type { LLMModelSettings, LLMProviderSettings } from '../../llm/types';
import { getSettingsManagementAPI } from '../../settings/api';
import { getProviderManagementAPI } from '../../llm/api';
import { registerFeatureSettingsRenderer } from '../../settings/components/settings-dialog';

// Register this panel as a child tab under 'ai' at module load time
registerFeatureSettingsRenderer({
  featureId: 'agent-templates',
  displayName: 'Templates',
  order: 25,
  defaults: { templates: [] },
  panelTagName: 'agent-templates-settings-panel',
  parentTab: 'ai'
});

/**
 * AgentTemplatesSettingsPanel Web Component
 * Panel for managing agent templates as a child tab within AI Settings
 */
export class AgentTemplatesSettingsPanel extends HTMLElement {
  private templates: AgentTemplate[] = [];
  private modelConfigs: LLMModelSettings[] = [];
  private providers: LLMProviderSettings[] = [];
  private settingsAPI = getSettingsManagementAPI();
  private providerAPI = getProviderManagementAPI();
  private isLoading = true;
  private mode: 'list' | 'add' | 'edit' = 'list';
  private editingTemplate?: AgentTemplate;

  async connectedCallback(): Promise<void> {
    this.renderLoading();
    await this.loadData();
    this.isLoading = false;
    this.render();
  }

  private renderLoading(): void {
    this.innerHTML = '<div class="p-4 text-gray-500 dark:text-gray-400">Loading...</div>';
  }

  private async loadData(): Promise<void> {
    try {
      const settings = await this.settingsAPI.getFeatureSettings<AgentTemplateFeatureSettings>('agent-templates');
      this.templates = settings.templates || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.templates = [];
    }

    try {
      this.modelConfigs = await this.providerAPI.getLLMModelSettingss();
    } catch (error) {
      console.error('Failed to load model configs:', error);
      this.modelConfigs = [];
    }

    try {
      this.providers = await this.providerAPI.getProviders();
    } catch (error) {
      console.error('Failed to load providers:', error);
      this.providers = [];
    }
  }

  private async saveTemplates(): Promise<void> {
    await this.settingsAPI.updateFeatureSettings<AgentTemplateFeatureSettings>('agent-templates', {
      templates: this.templates
    });
  }

  private render(): void {
    if (this.isLoading) {
      return;
    }

    this.innerHTML = `
      <div>
        ${this.mode === 'list' ? this.renderTemplateList() : this.renderTemplateForm()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderTemplateList(): string {
    if (this.templates.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-4">No agent templates yet</p>
          <button id="add-template-btn" class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
            Add Your First Template
          </button>
        </div>
      `;
    }

    return `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
          Saved Templates
        </h3>
        <button id="add-template-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Template
        </button>
      </div>

      <div id="templates-list" class="space-y-2">
        ${this.renderTemplates()}
      </div>
    `;
  }

  private renderTemplates(): string {
    return this.templates.map(template => `
      <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(template.name)}</span>
            <span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              ${this.escapeHtml(template.type)}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 m-0">
            ${this.escapeHtml(template.description)}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-0">
            ${this.escapeHtml(template.id)} ${template.config.modelId ? `• Model: ${this.escapeHtml(template.config.modelId)}` : ''} ${template.config.providerId ? `• Provider: ${this.escapeHtml(template.config.providerId)}` : ''}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="edit-template-btn p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent"
                  data-template-id="${this.escapeHtml(template.id)}" title="Edit template">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-template-btn p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer border-0 bg-transparent"
                  data-template-id="${this.escapeHtml(template.id)}" title="Delete template">
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  private renderTemplateForm(): string {
    const isEdit = this.mode === 'edit';
    const template = this.editingTemplate;

    return `
      <div class="p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 m-0">
          ${isEdit ? 'Edit Template' : 'Add New Template'}
        </h4>

        <form id="template-form" class="space-y-4">
          <!-- Template ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-id">
              Template ID <span class="text-red-500">*</span>
            </label>
            <input type="text" id="template-id" name="id" required
                   ${isEdit ? 'readonly' : ''}
                   pattern="[a-zA-Z0-9-_]+"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., code-reviewer, chat-assistant"
                   value="${this.escapeHtml(template?.id || '')}">
            ${isEdit ?
              '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Template ID cannot be changed</p>' :
              '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Letters, numbers, hyphens, and underscores only</p>'
            }
          </div>

          <!-- Display Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-name">
              Display Name <span class="text-red-500">*</span>
            </label>
            <input type="text" id="template-name" name="name" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g., Code Review Assistant, Chat Helper"
                   value="${this.escapeHtml(template?.name || '')}">
          </div>

          <!-- Agent Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-type">
              Agent Type <span class="text-red-500">*</span>
            </label>
            <select id="template-type" name="type" required
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select type...</option>
              <option value="chat" ${template?.type === 'chat' ? 'selected' : ''}>Chat</option>
              <option value="code" ${template?.type === 'code' ? 'selected' : ''}>Code</option>
              <option value="assistant" ${template?.type === 'assistant' ? 'selected' : ''}>Assistant</option>
              <option value="reviewer" ${template?.type === 'reviewer' ? 'selected' : ''}>Reviewer</option>
              <option value="app" ${template?.type === 'app' ? 'selected' : ''}>App</option>
              <option value="custom" ${template?.type === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-description">
              Description <span class="text-red-500">*</span>
            </label>
            <textarea id="template-description" name="description" required rows="2"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of what this template creates...">${this.escapeHtml(template?.description || '')}</textarea>
          </div>

          <!-- Model Config -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-model-config">
              Model Configuration (Optional)
            </label>
            <select id="template-model-config" name="modelId"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No model configuration</option>
              ${this.modelConfigs.map(config => `
                <option value="${this.escapeHtml(config.id)}" ${template?.config.modelId === config.id ? 'selected' : ''} class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  ${this.escapeHtml(config.name)}
                </option>
              `).join('')}
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Optional: Select a pre-configured model
            </p>
          </div>

          <!-- Provider -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-provider">
              Provider (Optional)
            </label>
            <select id="template-provider" name="providerId"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No provider selected</option>
              ${this.providers.map(provider => `
                <option value="${this.escapeHtml(provider.id)}" ${template?.config.providerId === provider.id ? 'selected' : ''} class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  ${this.escapeHtml(provider.name)} (${provider.type.toUpperCase()})
                </option>
              `).join('')}
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Optional: Select an LLM provider
            </p>
          </div>

          <!-- System Prompt -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-system-prompt">
              System Prompt (Optional)
            </label>
            <textarea id="template-system-prompt" name="systemPrompt" rows="4"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Instructions for the AI...">${this.escapeHtml(template?.prompts.system || '')}</textarea>
          </div>

          <!-- Default User Prompt -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="template-user-prompt">
              Default User Prompt (Optional)
            </label>
            <textarea id="template-user-prompt" name="userPrompt" rows="3"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Default prompt template...">${this.escapeHtml(template?.prompts.user || '')}</textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="cancel-form-btn"
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
              Cancel
            </button>
            <button type="submit"
                    class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
              ${isEdit ? 'Update Template' : 'Add Template'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Add template button
    const addTemplateBtn = this.querySelector('#add-template-btn');
    if (addTemplateBtn) {
      const newBtn = addTemplateBtn.cloneNode(true);
      addTemplateBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddForm());
    }

    // Form submit
    const form = this.querySelector('#template-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Cancel form button
    const cancelFormBtn = this.querySelector('#cancel-form-btn');
    if (cancelFormBtn) {
      const newBtn = cancelFormBtn.cloneNode(true);
      cancelFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showList());
    }

    // Edit buttons
    this.querySelectorAll('.edit-template-btn').forEach(btn => {
      const templateId = btn.getAttribute('data-template-id');
      if (!templateId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showEditForm(templateId));
    });

    // Delete buttons
    this.querySelectorAll('.delete-template-btn').forEach(btn => {
      const templateId = btn.getAttribute('data-template-id');
      if (!templateId) return;

      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.deleteTemplate(templateId));
    });
  }

  private showList(): void {
    this.mode = 'list';
    this.editingTemplate = undefined;
    this.render();
  }

  private showAddForm(): void {
    this.mode = 'add';
    this.editingTemplate = undefined;
    this.render();
  }

  private showEditForm(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    this.mode = 'edit';
    this.editingTemplate = template;
    this.render();
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const newTemplate: AgentTemplate = {
      id: formData.get('id') as string,
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
      createdAt: this.editingTemplate?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (this.mode === 'edit' && this.editingTemplate) {
        // Update existing template
        const index = this.templates.findIndex(t => t.id === this.editingTemplate!.id);
        if (index !== -1) {
          this.templates[index] = newTemplate;
        }
      } else {
        // Check for duplicate ID
        if (this.templates.some(t => t.id === newTemplate.id)) {
          alert(`Template with ID "${newTemplate.id}" already exists`);
          return;
        }
        // Add new template
        this.templates.push(newTemplate);
      }

      await this.saveTemplates();
      this.showList();
    } catch (error: any) {
      alert(`Failed to save template: ${error.message}`);
    }
  }

  private async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.find(t => t.id === id);
    if (!template) return;

    const confirmed = confirm(
      `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      this.templates = this.templates.filter(t => t.id !== id);
      await this.saveTemplates();
      this.render();
    } catch (error: any) {
      alert(`Failed to delete template: ${error.message}`);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('agent-templates-settings-panel', AgentTemplatesSettingsPanel);
