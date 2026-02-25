import { getSettingsManagementAPI } from '../../settings/api';
import type { Tool, CustomToolsFeatureSettings } from '../types';
import { registerFeatureSettingsRenderer } from '../../settings/components/settings-dialog';

// Register this panel as a child tab under 'ai' at module load time
registerFeatureSettingsRenderer<CustomToolsFeatureSettings>({
  featureId: 'custom-tools',
  displayName: 'Custom Tools',
  order: 30,
  defaults: { tools: [] },
  panelTagName: 'custom-tools-settings-panel',
  parentTab: 'ai'
});

/**
 * CustomToolsSettingsPanel Web Component
 * Panel for managing custom JavaScript tools as a child tab within AI Settings
 */
export class CustomToolsSettingsPanel extends HTMLElement {
  private settingsAPI = getSettingsManagementAPI();
  private tools: Tool[] = [];
  private editingTool: Tool | null = null;
  private editingToolIndex: number = -1;
  private isLoading = true;

  async connectedCallback(): Promise<void> {
    this.renderLoading();
    await this.loadTools();
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

    const customTools = this.tools.filter(t => (t.toolType || 'custom') === 'custom');
    // Note: this.editingToolIndex === -1 && this.editingTool !== null indicates adding a new tool

    this.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
            Custom JavaScript Tools (${customTools.length})
          </h3>
          <button id="add-tool-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Tool
          </button>
        </div>

        <div id="tools-list" class="space-y-2">
          ${this.renderToolsListWithForm()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderToolsListWithForm(): string {
    const customTools = this.tools.filter(t => (t.toolType || 'custom') === 'custom');
    const isAdding = this.editingToolIndex === -1 && this.editingTool !== null;

    if (customTools.length === 0 && !isAdding) {
      return `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8 m-0">
          No tools yet. Click "Add Tool" to create one.
        </p>
      `;
    }

    const parts: string[] = [];

    if (isAdding) {
      parts.push(this.renderToolForm('Add New Tool'));
    }

    customTools.forEach((tool, index) => {
      const environment = tool.environment || 'node';
      const envBadgeClass = environment === 'browser'
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';

      parts.push(`
        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${!tool.enabled ? 'opacity-60' : ''}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(tool.name)}</span>
              <span class="text-xs px-2 py-0.5 rounded ${tool.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}">
                ${tool.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span class="text-xs px-2 py-0.5 rounded ${envBadgeClass}">
                ${environment === 'browser' ? 'Browser' : 'Node'}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">${this.escapeHtml(tool.description)}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 m-0">
              Environment: ${environment} • Timeout: ${tool.timeout || 30000}ms • Created: ${new Date(tool.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div class="flex gap-1">
            <button class="edit-tool-btn p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-tool-name="${this.escapeHtml(tool.name)}" data-tool-index="${index}" title="Edit tool">
              <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="delete-tool-btn p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-tool-name="${this.escapeHtml(tool.name)}" title="Delete tool">
              <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `);

      if (this.editingToolIndex === index && this.editingTool !== null) {
        parts.push(this.renderToolForm('Edit Tool'));
      }
    });

    return parts.join('');
  }

  private renderToolForm(title: string): string {
    const tool = this.editingTool;
    const name = tool?.name || '';
    const description = tool?.description || '';
    const code = tool?.code || '';
    const parameters = tool?.parameters ? JSON.stringify(tool.parameters, null, 2) : '';
    const returns = tool?.returns ? JSON.stringify(tool.returns, null, 2) : '';
    const timeout = tool?.timeout || 30000;
    const environment = tool?.environment || 'node';
    const enabled = tool?.enabled !== false;

    return `
      <div id="tool-form" class="mt-2 mb-2 p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 m-0">${title}</h4>
        <form id="tool-form-element" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-name">
                Name <span class="text-red-500">*</span>
              </label>
              <input type="text" id="tool-name" name="name" required
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g., calculate_distance" value="${this.escapeHtml(name)}">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-environment">
                Execution Environment
              </label>
              <select id="tool-environment" name="environment"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="node" ${environment === 'node' ? 'selected' : ''}>Node.js (File system, child processes, etc.)</option>
                <option value="browser" ${environment === 'browser' ? 'selected' : ''}>Browser (Fetch, localStorage, DOM, etc.)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-timeout">
                Timeout (ms)
              </label>
              <input type="number" id="tool-timeout" name="timeout" value="${timeout}" min="1000" max="300000"
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="30000">
            </div>
            <div class="flex items-end">
              <p class="text-xs text-gray-500 dark:text-gray-400 pb-2.5 m-0">
                Node.js tools run in isolated process. Browser tools run in renderer.
              </p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-description">
              Description <span class="text-red-500">*</span>
            </label>
            <input type="text" id="tool-description" name="description" required
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="What this tool does (shown to AI agent)" value="${this.escapeHtml(description)}">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-code">
              JavaScript Code <span class="text-red-500">*</span>
            </label>
            <textarea id="tool-code" name="code" required rows="8"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="function tool(params) { ... }">${this.escapeHtml(code)}</textarea>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
              Code must export a function named "tool" or "run" that takes a params object
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-parameters">
                Parameters (JSON Schema) <span class="text-red-500">*</span>
              </label>
              <textarea id="tool-parameters" name="parameters" required rows="4"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{"type": "object", "properties": {...}, "required": [...]}'>${this.escapeHtml(parameters)}</textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-returns">
                Returns (JSON Schema - Optional)
              </label>
              <textarea id="tool-returns" name="returns" rows="4"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{"type": "object", "properties": {...}, "required": [...]}'>${this.escapeHtml(returns)}</textarea>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="tool-enabled" name="enabled" ${enabled ? 'checked' : ''} class="w-4 h-4">
            <label for="tool-enabled" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enabled (available for agents to use)
            </label>
          </div>

          <div class="flex justify-between items-center pt-2">
            <div class="flex gap-2">
              <button type="button" id="test-tool-btn"
                      class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                Test Code
              </button>
            </div>
            <div class="flex gap-2">
              <button type="button" id="cancel-form-btn"
                      class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                Cancel
              </button>
              <button type="submit"
                      class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
                Save Tool
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Add tool button
    const addToolBtn = this.querySelector('#add-tool-btn');
    if (addToolBtn) {
      const newBtn = addToolBtn.cloneNode(true);
      addToolBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddForm());
    }

    // Form submit
    const form = this.querySelector('#tool-form-element');
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
      (newBtn as HTMLElement).addEventListener('click', () => this.hideForm());
    }

    // Test tool button
    const testToolBtn = this.querySelector('#test-tool-btn');
    if (testToolBtn) {
      const newBtn = testToolBtn.cloneNode(true);
      testToolBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.testTool());
    }

    // Edit buttons
    this.querySelectorAll('.edit-tool-btn').forEach(btn => {
      const toolName = btn.getAttribute('data-tool-name');
      if (!toolName) return;
      btn.addEventListener('click', () => this.showEditForm(toolName));
    });

    // Delete buttons
    this.querySelectorAll('.delete-tool-btn').forEach(btn => {
      const toolName = btn.getAttribute('data-tool-name');
      if (!toolName) return;
      btn.addEventListener('click', () => this.deleteTool(toolName));
    });
  }

  private async loadTools(): Promise<void> {
    try {
      const settings = await this.settingsAPI.getFeatureSettings<CustomToolsFeatureSettings>('custom-tools');
      this.tools = (settings.tools || []).map((t: Tool) => ({
        ...t,
        toolType: t.toolType || 'custom'
      }));
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.tools = [];
    }
  }

  private async saveTools(): Promise<void> {
    await this.settingsAPI.updateFeatureSettings<CustomToolsFeatureSettings>('custom-tools', {
      tools: this.tools
    });
  }

  private showAddForm(): void {
    this.editingToolIndex = -1;
    this.editingTool = {
      name: '',
      description: '',
      code: '',
      parameters: { type: 'object', properties: {} },
      timeout: 30000,
      environment: 'node',
      enabled: true,
      createdAt: Date.now()
    };
    this.render();
  }

  private showEditForm(toolName: string): void {
    const customTools = this.tools.filter(t => (t.toolType || 'custom') === 'custom');
    const toolIndex = customTools.findIndex(t => t.name === toolName);
    const tool = customTools[toolIndex];
    if (!tool) return;

    this.editingToolIndex = toolIndex;
    this.editingTool = { ...tool };
    this.render();
  }

  private hideForm(): void {
    this.editingToolIndex = -1;
    this.editingTool = null;
    this.render();
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const parameters = JSON.parse(formData.get('parameters') as string);
      const returnsValue = formData.get('returns') as string;
      const returns = returnsValue ? JSON.parse(returnsValue) : undefined;

      const toolData: Tool = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        code: formData.get('code') as string,
        parameters,
        returns,
        timeout: parseInt(formData.get('timeout') as string) || 30000,
        environment: (formData.get('environment') as 'node' | 'browser') || 'node',
        enabled: (formData.get('enabled') as string) === 'on',
        toolType: 'custom',
        createdAt: this.editingTool?.createdAt || Date.now(),
        updatedAt: this.editingToolIndex >= 0 ? Date.now() : undefined
      };

      // Validate tool code by attempting to create a function
      try {
        new Function('params', `"use strict"; ${toolData.code}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Invalid tool code: ${message}`);
        return;
      }

      if (this.editingToolIndex >= 0 && this.editingTool) {
        // Check for duplicate name if name changed
        if (toolData.name !== this.editingTool.name) {
          if (this.tools.some(t => t.name === toolData.name)) {
            alert(`Tool with name "${toolData.name}" already exists`);
            return;
          }
        }
        // Update existing tool
        const index = this.tools.findIndex(t => t.name === this.editingTool!.name);
        if (index !== -1) {
          this.tools[index] = toolData;
        }
      } else {
        // Check for duplicate name
        if (this.tools.some(t => t.name === toolData.name)) {
          alert(`Tool with name "${toolData.name}" already exists`);
          return;
        }
        // Add new tool
        this.tools.push(toolData);
      }

      await this.saveTools();
      this.hideForm();
    } catch (error: any) {
      alert(`Error saving tool: ${error.message}`);
    }
  }

  private async deleteTool(toolName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete tool "${toolName}"?`)) {
      return;
    }

    try {
      this.tools = this.tools.filter(t => t.name !== toolName);
      await this.saveTools();
      this.render();
    } catch (error: any) {
      alert(`Error deleting tool: ${error.message}`);
    }
  }

  private async testTool(): Promise<void> {
    const code = (this.querySelector('#tool-code') as HTMLTextAreaElement).value;
    const parametersText = (this.querySelector('#tool-parameters') as HTMLTextAreaElement).value;
    const name = (this.querySelector('#tool-name') as HTMLInputElement)?.value || 'Test Tool';
    const description = (this.querySelector('#tool-description') as HTMLInputElement)?.value || '';
    const timeout = (this.querySelector('#tool-timeout') as HTMLInputElement)?.value || '30000';
    const environment = (this.querySelector('#tool-environment') as HTMLSelectElement)?.value || 'node';

    let toolData: Tool;
    try {
      const parameters = JSON.parse(parametersText);
      toolData = {
        name,
        description,
        code,
        parameters,
        timeout: parseInt(timeout) || 30000,
        environment: environment as 'node' | 'browser',
        enabled: true,
        createdAt: Date.now()
      };
    } catch (error: any) {
      alert(`Invalid JSON in parameters field: ${error.message}`);
      return;
    }

    // Dynamically import and create test dialog
    await import('./tool-test-dialog');
    const testDialog = document.createElement('tool-test-dialog') as HTMLElement;
    testDialog.dataset.tool = JSON.stringify(toolData);
    document.body.appendChild(testDialog);

    testDialog.addEventListener('tool-test-dialog-close', () => {
      testDialog.remove();
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('custom-tools-settings-panel', CustomToolsSettingsPanel);
