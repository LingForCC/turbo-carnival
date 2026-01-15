import type { Tool } from '../global.d.ts';

/**
 * ToolsDialog Web Component
 * Modal dialog for managing custom tools
 */
export class ToolsDialog extends HTMLElement {
  private tools: Tool[] = [];
  private editingTool: Tool | null = null;

  constructor() {
    super();
  }

  async connectedCallback(): Promise<void> {
    await this.loadTools();
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 m-0">Custom Tools</h2>
              <p class="text-sm text-gray-500 mt-1 mb-0">
                Create JavaScript tools that AI agents can execute
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tools List -->
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide m-0">
                Saved Tools (${this.tools.length})
              </h3>
              <button id="add-tool-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium cursor-pointer border-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Tool
              </button>
            </div>

            <div id="tools-list" class="space-y-2">
              ${this.renderToolsList()}
            </div>

            <!-- Add/Edit Tool Form (hidden by default) -->
            <div id="tool-form" class="hidden mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 class="text-sm font-medium text-gray-700 mb-3 m-0" id="form-title">Add New Tool</h4>
              <form id="tool-form-element" class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-name">
                      Name <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="tool-name" name="name" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="e.g., calculate_distance">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-timeout">
                      Timeout (ms)
                    </label>
                    <input type="number" id="tool-timeout" name="timeout" value="30000" min="1000" max="300000"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="30000">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-description">
                    Description <span class="text-red-500">*</span>
                  </label>
                  <input type="text" id="tool-description" name="description" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="What this tool does (shown to AI agent)">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-code">
                    JavaScript Code <span class="text-red-500">*</span>
                  </label>
                  <textarea id="tool-code" name="code" required rows="8"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="function tool(params) { ... }"></textarea>
                  <p class="text-xs text-gray-500 mt-1 mb-0">
                    Code must export a function named "tool" or "run" that takes a params object
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-parameters">
                      Parameters (JSON Schema) <span class="text-red-500">*</span>
                    </label>
                    <textarea id="tool-parameters" name="parameters" required rows="4"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              placeholder='{"type": "object", "properties": {...}, "required": [...]}'></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" for="tool-returns">
                      Returns (JSON Schema - Optional)
                    </label>
                    <textarea id="tool-returns" name="returns" rows="4"
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              placeholder='{"type": "object", "properties": {...}, "required": [...]}'></textarea>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <input type="checkbox" id="tool-enabled" name="enabled" checked class="w-4 h-4">
                  <label for="tool-enabled" class="text-sm font-medium text-gray-700">
                    Enabled (available for agents to use)
                  </label>
                </div>

                <div class="flex justify-between items-center pt-2">
                  <div class="flex gap-2">
                    <button type="button" id="test-tool-btn"
                            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border-0">
                      Test Code
                    </button>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" id="cancel-form-btn"
                            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border-0">
                      Cancel
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer border-0">
                      Save Tool
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderToolsList(): string {
    if (this.tools.length === 0) {
      return `
        <p class="text-sm text-gray-400 text-center py-8 m-0">
          No tools yet. Click "Add Tool" to create one.
        </p>
      `;
    }

    return this.tools.map(tool => `
      <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 ${!tool.enabled ? 'opacity-60' : ''}">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${this.escapeHtml(tool.name)}</span>
            <span class="text-xs px-2 py-0.5 rounded ${tool.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
              ${tool.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p class="text-sm text-gray-600 mt-1 truncate">${this.escapeHtml(tool.description)}</p>
          <p class="text-xs text-gray-400 mt-0.5 m-0">
            Timeout: ${tool.timeout || 30000}ms • Created: ${new Date(tool.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div class="flex gap-1">
          <button class="edit-tool-btn p-1.5 hover:bg-blue-100 rounded cursor-pointer border-0 bg-transparent"
                  data-tool-name="${this.escapeHtml(tool.name)}" title="Edit tool">
            <svg class="w-4 h-4 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-tool-btn p-1.5 hover:bg-red-100 rounded cursor-pointer border-0 bg-transparent"
                  data-tool-name="${this.escapeHtml(tool.name)}" title="Delete tool">
            <svg class="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
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
    if (window.electronAPI) {
      try {
        this.tools = await window.electronAPI.getTools();
      } catch (error) {
        console.error('Failed to load tools:', error);
      }
    }
  }

  private showAddForm(): void {
    this.editingTool = null;
    const form = this.querySelector('#tool-form');
    const formTitle = this.querySelector('#form-title');
    if (form) form.classList.remove('hidden');
    if (formTitle) formTitle.textContent = 'Add New Tool';

    // Clear form
    const formElement = this.querySelector('#tool-form-element') as HTMLFormElement;
    if (formElement) formElement.reset();

    // Set default values
    const timeoutInput = this.querySelector('#tool-timeout') as HTMLInputElement;
    if (timeoutInput) timeoutInput.value = '30000';

    const enabledInput = this.querySelector('#tool-enabled') as HTMLInputElement;
    if (enabledInput) enabledInput.checked = true;
  }

  private showEditForm(toolName: string): void {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) return;

    this.editingTool = tool;
    const form = this.querySelector('#tool-form');
    const formTitle = this.querySelector('#form-title');
    if (form) form.classList.remove('hidden');
    if (formTitle) formTitle.textContent = 'Edit Tool';

    // Populate form
    const formElement = this.querySelector('#tool-form-element') as HTMLFormElement;
    if (formElement) {
      (formElement.elements.namedItem('name') as HTMLInputElement).value = tool.name;
      (formElement.elements.namedItem('description') as HTMLInputElement).value = tool.description;
      (formElement.elements.namedItem('code') as HTMLTextAreaElement).value = tool.code;
      (formElement.elements.namedItem('parameters') as HTMLTextAreaElement).value = JSON.stringify(tool.parameters, null, 2);
      (formElement.elements.namedItem('returns') as HTMLTextAreaElement).value = tool.returns ? JSON.stringify(tool.returns, null, 2) : '';
      (formElement.elements.namedItem('timeout') as HTMLInputElement).value = String(tool.timeout || 30000);
      (formElement.elements.namedItem('enabled') as HTMLInputElement).checked = tool.enabled;
    }
  }

  private hideForm(): void {
    const form = this.querySelector('#tool-form');
    if (form) form.classList.add('hidden');
    this.editingTool = null;
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      // Parse JSON fields
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
        enabled: (formData.get('enabled') as string) === 'on',
        createdAt: this.editingTool?.createdAt || Date.now(),
        updatedAt: this.editingTool ? Date.now() : undefined
      };

      if (this.editingTool) {
        await window.electronAPI!.updateTool(this.editingTool.name, toolData);
      } else {
        await window.electronAPI!.addTool(toolData);
      }

      await this.loadTools();
      this.hideForm();
      this.render();
    } catch (error: any) {
      alert(`Error saving tool: ${error.message}`);
    }
  }

  private async deleteTool(toolName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete tool "${toolName}"?`)) {
      return;
    }

    try {
      await window.electronAPI!.removeTool(toolName);
      await this.loadTools();
      this.render();
    } catch (error: any) {
      alert(`Error deleting tool: ${error.message}`);
    }
  }

  private async testTool(): Promise<void> {
    const code = (this.querySelector('#tool-code') as HTMLTextAreaElement).value;
    const parameters = (this.querySelector('#tool-parameters') as HTMLTextAreaElement).value;

    try {
      JSON.parse(parameters); // Validate parameters schema
      new Function('params', `"use strict"; ${code}`); // Validate code syntax

      // Try to execute with empty params
      const testFn = new Function('params', `"use strict"; ${code}; return typeof tool === 'function' || typeof run === 'function';`);
      const hasExport = testFn({});

      if (hasExport) {
        alert('✓ Code syntax is valid and exports a function named "tool" or "run"');
      } else {
        alert('⚠ Code must export a function named "tool" or "run"');
      }
    } catch (error: any) {
      alert(`✗ Validation error: ${error.message}`);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('tools-dialog-close', {
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
customElements.define('tools-dialog', ToolsDialog);
