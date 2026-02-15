import { getToolManagementAPI } from '../api';
import type { ToolManagementAPI, Tool, ToolExecutionResult, JSONSchema } from '../types';
import { executeToolInBrowser } from '../browser/browser-tool-executor';

/**
 * ToolTestDialog Web Component
 * Modal dialog for testing tool execution with custom parameters
 */
export class ToolTestDialog extends HTMLElement {
  private api: ToolManagementAPI;
  private tool: Tool | null = null;
  private executionResult: ToolExecutionResult | null = null;
  private isExecuting: boolean = false;
  private arrayItems: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.api = getToolManagementAPI();
  }

  connectedCallback(): void {
    // Parse tool data from attribute
    const toolData = this.dataset.tool;
    if (toolData) {
      try {
        this.tool = JSON.parse(toolData);
      } catch (error) {
        console.error('Failed to parse tool data:', error);
      }
    }

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">Test Tool</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                ${this.escapeHtml(this.tool?.name || 'Unknown Tool')}
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- Tool Description -->
            <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p class="text-sm text-gray-700 dark:text-gray-300 m-0">${this.escapeHtml(this.tool?.description || 'No description')}</p>
            </div>

            <!-- Parameters Form -->
            <form id="test-form" class="space-y-4">
              ${this.generateFormFields()}

              <!-- Actions -->
              <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" id="reset-btn" class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                  Reset Form
                </button>
                <button type="submit" id="run-test-btn" ${this.isExecuting ? 'disabled' : ''}
                        class="px-6 py-2 ${this.isExecuting ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'} text-white rounded-lg cursor-pointer border-0 flex items-center gap-2">
                  ${this.isExecuting ? `
                    <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing...
                  ` : 'Run Test'}
                </button>
              </div>
            </form>

            <!-- Execution Result -->
            ${this.renderExecutionResult()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private generateFormFields(): string {
    if (!this.tool?.parameters?.properties) {
      return '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">This tool requires no parameters.</p>';
    }

    return Object.entries(this.tool.parameters.properties)
      .map(([propName, propSchema]) => this.generateFormField(propName, propSchema))
      .join('');
  }

  private generateFormField(propertyName: string, schema: JSONSchema, depth: number = 0): string {
    const isRequired = this.tool?.parameters.required?.includes(propertyName);
    const description = schema.description;
    const fieldId = `field-${propertyName.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const indent = depth > 0 ? 'ml-4 pl-4 border-l-2 border-gray-300 dark:border-gray-600' : '';

    // Handle enum (select dropdown)
    if (schema.enum) {
      return `
        <div class="${indent}">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="${fieldId}">
            ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
            ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400 block">${this.escapeHtml(description)}</span>` : ''}
          </label>
          <select id="${fieldId}" name="${propertyName}"
                  ${isRequired ? 'required' : ''}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            ${!isRequired ? '<option value="">Select an option...</option>' : ''}
            ${schema.enum.map((val: any) => `
              <option value="${this.escapeHtml(String(val))}">${this.escapeHtml(String(val))}</option>
            `).join('')}
          </select>
        </div>
      `;
    }

    // Handle different types
    switch (schema.type) {
      case 'string':
        // Use textarea for long strings or if hint suggests it
        const useTextarea = schema.minLength > 100 || description?.toLowerCase().includes('text') || description?.toLowerCase().includes('content');
        return `
          <div class="${indent}">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="${fieldId}">
              ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
              ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400 block">${this.escapeHtml(description)}</span>` : ''}
            </label>
            ${useTextarea ? `
              <textarea id="${fieldId}" name="${propertyName}"
                        ${isRequired ? 'required' : ''}
                        rows="4"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="${this.escapeHtml(description || 'Enter text...')}"></textarea>
            ` : `
              <input type="text" id="${fieldId}" name="${propertyName}"
                     ${isRequired ? 'required' : ''}
                     class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                     placeholder="${this.escapeHtml(description || 'Enter value...')}">
            `}
          </div>
        `;

      case 'number':
        return `
          <div class="${indent}">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="${fieldId}">
              ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
              ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400 block">${this.escapeHtml(description)}</span>` : ''}
            </label>
            <input type="number" id="${fieldId}" name="${propertyName}"
                   ${isRequired ? 'required' : ''}
                   min="${schema.minimum !== undefined ? schema.minimum : ''}"
                   max="${schema.maximum !== undefined ? schema.maximum : ''}"
                   step="${schema.multipleOf || 'any'}"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                   placeholder="Enter number">
          </div>
        `;

      case 'boolean':
        return `
          <div class="flex items-center gap-2 ${indent}">
            <input type="checkbox" id="${fieldId}" name="${propertyName}"
                   class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500">
            <label for="${fieldId}" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
            </label>
            ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400">${this.escapeHtml(description)}</span>` : ''}
          </div>
        `;

      case 'array':
        return this.generateArrayField(propertyName, schema, isRequired, description, indent);

      case 'object':
        return this.generateObjectField(propertyName, schema, isRequired, description, indent, depth);

      default:
        // Fallback to text input
        return `
          <div class="${indent}">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="${fieldId}">
              ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <input type="text" id="${fieldId}" name="${propertyName}"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          </div>
        `;
    }
  }

  private generateArrayField(propertyName: string, schema: JSONSchema, isRequired: boolean, description: string | undefined, indent: string): string {
    const fieldId = `field-${propertyName.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const items = this.arrayItems.get(propertyName) || [];
    const itemSchema = schema.items;

    return `
      <div class="${indent} border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
          <span class="text-xs text-gray-500 dark:text-gray-400 block">Array of ${itemSchema?.type || 'items'}</span>
          ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400">${this.escapeHtml(description)}</span>` : ''}
        </label>
        <div id="${fieldId}-items" class="space-y-2">
          ${items.map((item, index) => `
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400 w-6">${index + 1}.</span>
              <input type="text" name="${propertyName}[${index}]" value="${this.escapeHtml(String(item))}"
                     class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <button type="button" class="remove-array-item-btn text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm px-2 py-1"
                      data-field="${propertyName}" data-index="${index}">
                Remove
              </button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="add-array-item-btn mt-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                data-field="${propertyName}">
          + Add Item
        </button>
      </div>
    `;
  }

  private generateObjectField(propertyName: string, schema: JSONSchema, isRequired: boolean, description: string | undefined, indent: string, depth: number): string {
    const properties = schema.properties;

    if (!properties || Object.keys(properties).length === 0) {
      return `
        <div class="${indent}">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400">Empty object (no properties defined)</p>
        </div>
      `;
    }

    return `
      <div class="${indent}">
        <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          ${this.escapeHtml(propertyName)} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
          ${description ? `<span class="text-xs text-gray-500 dark:text-gray-400 block">${this.escapeHtml(description)}</span>` : ''}
        </h5>
        ${Object.entries(properties)
          .map(([propName, propSchema]: [string, any]) =>
            this.generateFormField(`${propertyName}.${propName}`, propSchema, depth + 1)
          ).join('')}
      </div>
    `;
  }

  private renderExecutionResult(): string {
    if (!this.executionResult) {
      return '';
    }

    const result = this.executionResult;
    const isSuccess = result.success;

    return `
      <div class="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <!-- Result Header -->
        <div class="px-4 py-3 ${isSuccess ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="${isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium">
              ${isSuccess ? '✓ Success' : '✗ Failed'}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Executed in ${result.executionTime}ms
            </span>
          </div>
          <button type="button" id="copy-result-btn"
                  class="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer border-0 bg-transparent">
            Copy Result
          </button>
        </div>

        <!-- Result Content -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 max-h-96 overflow-y-auto">
          <pre class="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">${this.escapeHtml(
            isSuccess
              ? JSON.stringify(result.result, null, 2)
              : result.error || 'Unknown error'
          )}</pre>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Form submit
    const form = this.querySelector('#test-form');
    if (form) {
      const newForm = form.cloneNode(true);
      form.replaceWith(newForm);
      (newForm as HTMLFormElement).addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Reset button
    const resetBtn = this.querySelector('#reset-btn');
    if (resetBtn) {
      const newBtn = resetBtn.cloneNode(true);
      resetBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.resetForm());
    }

    // Copy result button
    const copyBtn = this.querySelector('#copy-result-btn');
    if (copyBtn) {
      const newBtn = copyBtn.cloneNode(true);
      copyBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.copyResult());
    }

    // Array item add buttons
    this.querySelectorAll('.add-array-item-btn').forEach(btn => {
      const fieldName = btn.getAttribute('data-field');
      if (!fieldName) return;
      btn.addEventListener('click', () => this.addArrayItem(fieldName));
    });

    // Array item remove buttons
    this.querySelectorAll('.remove-array-item-btn').forEach(btn => {
      const fieldName = btn.getAttribute('data-field');
      const index = btn.getAttribute('data-index');
      if (!fieldName || index === null) return;
      btn.addEventListener('click', () => this.removeArrayItem(fieldName, parseInt(index)));
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Build parameters object from form data
    const parameters: Record<string, any> = this.buildParametersFromForm(formData);

    // Execute tool
    this.isExecuting = true;
    this.render();

    try {
      if (!this.tool?.name) {
        throw new Error('Tool name not specified');
      }

      const environment = this.tool.environment || 'node';
      const timeout = this.tool.timeout || 30000;

      let result: ToolExecutionResult;

      if (environment === 'browser') {
        // Execute browser tools directly in renderer
        const browserResult = await executeToolInBrowser(this.tool.code, parameters, timeout);
        result = browserResult;
      } else {
        // Execute Node.js tools via main process
        result = await this.api.executeTool({
          toolName: this.tool.name,
          parameters,
          tool: this.tool  // Pass full tool data for direct execution
        });
      }

      this.executionResult = result;
    } catch (error: any) {
      this.executionResult = {
        success: false,
        error: error.message || String(error),
        executionTime: 0
      };
    } finally {
      this.isExecuting = false;
      this.render();
    }
  }

  private buildParametersFromForm(formData: FormData): Record<string, any> {
    const parameters: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      // Check if this is an array item (e.g., "tags[0]")
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        if (!parameters[arrayName]) {
          parameters[arrayName] = [];
        }
        parameters[arrayName][parseInt(index)] = this.convertValue(key, value);
        continue;
      }

      // Check if this is a nested property (e.g., "address.city")
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = parameters;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = this.convertValue(key, value);
        continue;
      }

      // Simple property
      parameters[key] = this.convertValue(key, value);
    }

    return parameters;
  }

  private convertValue(key: string, value: FormDataEntryValue): any {
    if (!this.tool?.parameters?.properties) return value;

    // Get the base property name (handle nested and array)
    const baseKey = key.split('.')[0].split('[')[0];
    let propSchema = this.tool.parameters.properties[baseKey];

    if (!propSchema) {
      // Try to find in nested properties
      const parts = key.split('.');
      if (parts.length > 1) {
        let nestedSchema = this.tool.parameters.properties[parts[0]];
        for (let i = 1; i < parts.length - 1; i++) {
          nestedSchema = nestedSchema?.properties?.[parts[i]];
        }
        if (nestedSchema?.properties) {
          const finalProp = parts[parts.length - 1];
          propSchema = nestedSchema.properties[finalProp];
        }
      }
    }

    if (!propSchema) return value;

    switch (propSchema.type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'on';
      case 'array':
        if (propSchema.items?.type === 'number') {
          return Number(value);
        }
        return String(value);
      case 'object':
        try {
          return JSON.parse(String(value));
        } catch {
          return value;
        }
      default:
        return String(value);
    }
  }

  private addArrayItem(fieldName: string): void {
    const items = this.arrayItems.get(fieldName) || [];
    items.push('');
    this.arrayItems.set(fieldName, items);
    this.render();
    this.attachEventListeners();
  }

  private removeArrayItem(fieldName: string, index: number): void {
    const items = this.arrayItems.get(fieldName) || [];
    items.splice(index, 1);
    this.arrayItems.set(fieldName, items);
    this.render();
    this.attachEventListeners();
  }

  private resetForm(): void {
    const form = this.querySelector('#test-form') as HTMLFormElement;
    if (form) {
      form.reset();
      this.executionResult = null;
      this.arrayItems.clear();
      this.render();
    }
  }

  private async copyResult(): Promise<void> {
    if (!this.executionResult) return;

    const text = this.executionResult.success
      ? JSON.stringify(this.executionResult.result, null, 2)
      : this.executionResult.error || '';

    try {
      await navigator.clipboard.writeText(text);
      // Could add visual feedback here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('tool-test-dialog-close', {
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
customElements.define('tool-test-dialog', ToolTestDialog);
