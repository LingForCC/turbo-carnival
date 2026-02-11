import { getToolManagementAPI } from '../api/tool-management';
import type { ToolManagementAPI, Tool, MCPServerConfig } from '../types/tool-management';

/**
 * ToolsDialog Web Component
 * Modal dialog for managing custom tools and MCP tools
 */
export class ToolsDialog extends HTMLElement {
  private api: ToolManagementAPI;
  private tools: Tool[] = [];
  private editingTool: Tool | null = null;
  private activeTab: 'custom' | 'mcp' = 'custom';
  private mcpServers: MCPServerConfig[] = [];
  private mcpTools: Tool[] = [];
  private editingMCPServer: MCPServerConfig | null = null;

  constructor() {
    super();
    this.api = getToolManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    await this.loadTools();
    await this.loadMCPServers();
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">Tools Management</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                  Manage custom JavaScript tools and MCP servers
                </p>
              </div>
              <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
                <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Tab Navigation -->
            <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
              <button id="tab-custom" class="px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer border-0 ${this.activeTab === 'custom' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}">
                Custom Tools (${this.tools.filter(t => (t.toolType || 'custom') === 'custom').length})
              </button>
              <button id="tab-mcp" class="px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer border-0 ${this.activeTab === 'mcp' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}">
                MCP Tools (${this.mcpTools.length})
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            ${this.activeTab === 'custom' ? this.renderCustomTab() : this.renderMCPTab()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderCustomTab(): string {
    const customTools = this.tools.filter(t => (t.toolType || 'custom') === 'custom');
    return `
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
          ${this.renderToolsList()}
        </div>

        <!-- Add/Edit Tool Form (hidden by default) -->
        <div id="tool-form" class="hidden mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 m-0" id="form-title">Add New Tool</h4>
          <form id="tool-form-element" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-name">
                  Name <span class="text-red-500">*</span>
                </label>
                <input type="text" id="tool-name" name="name" required
                       class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="e.g., calculate_distance">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-environment">
                  Execution Environment
                </label>
                <select id="tool-environment" name="environment"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="node">Node.js (File system, child processes, etc.)</option>
                  <option value="browser">Browser (Fetch, localStorage, DOM, etc.)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-timeout">
                  Timeout (ms)
                </label>
                <input type="number" id="tool-timeout" name="timeout" value="30000" min="1000" max="300000"
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
                     placeholder="What this tool does (shown to AI agent)">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-code">
                JavaScript Code <span class="text-red-500">*</span>
              </label>
              <textarea id="tool-code" name="code" required rows="8"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="function tool(params) { ... }"></textarea>
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
                          placeholder='{"type": "object", "properties": {...}, "required": [...]}'></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="tool-returns">
                  Returns (JSON Schema - Optional)
                </label>
                <textarea id="tool-returns" name="returns" rows="4"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder='{"type": "object", "properties": {...}, "required": [...]}'></textarea>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="tool-enabled" name="enabled" checked class="w-4 h-4">
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
      </div>
    `;
  }

  private renderMCPTab(): string {
    return `
      <div>
        <!-- MCP Servers Section -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">
            MCP Servers (${this.mcpServers.length})
          </h3>
          <button id="add-mcp-server-btn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-sm font-medium cursor-pointer border-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Server
          </button>
        </div>

        <div id="mcp-servers-list" class="space-y-2 mb-6">
          ${this.renderMCPServersList()}
        </div>

        <!-- MCP Tools Section -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 m-0">
            Discovered MCP Tools (${this.mcpTools.length})
          </h3>
          <div id="mcp-tools-list" class="space-y-2">
            ${this.renderMCPToolsList()}
          </div>
        </div>

        <!-- Add/Edit MCP Server Form (hidden by default) -->
        <div id="mcp-server-form" class="hidden mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 m-0" id="mcp-form-title">Add MCP Server</h4>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="mcp-config-json">
                Server Configuration (JSON) <span class="text-red-500">*</span>
              </label>
              <textarea id="mcp-config-json" required rows="10"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{
  "name": "jira",
  "transport": "streamable-http",
  "url": "https://mcp-server.example.com/mcp",
  "headers": {
    "jira_token": "your-jira-token",
    "mcp-session-id": "unique-session-id"
  }
}'></textarea>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
                Transports: "stdio" (command, args, env) or "streamable-http" (url, headers)
              </p>
            </div>

            <div class="flex justify-between items-center pt-2">
              <button type="button" id="test-mcp-connection-btn"
                      class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                Test Connection
              </button>
              <div class="flex gap-2">
                <button type="button" id="cancel-mcp-form-btn"
                        class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0">
                  Cancel
                </button>
                <button type="button" id="save-mcp-server-btn"
                        class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg cursor-pointer border-0">
                  Save Server
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderMCPServersList(): string {
    if (this.mcpServers.length === 0) {
      return `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8 m-0">
          No MCP servers configured. Click "Add Server" to connect to an MCP server.
        </p>
      `;
    }

    return this.mcpServers.map(server => {
      const statusClass = server.connected
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

      return `
        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(server.name)}</span>
              <span class="text-xs px-2 py-0.5 rounded ${statusClass}">
                ${server.connected ? 'Connected' : 'Disconnected'}
              </span>
              <span class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                ${server.transport}
              </span>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 m-0">
              ${server.transport === 'stdio' ? `${server.command} ${server.args?.join(' ') || ''}` : server.url}
              ${server.toolCount !== undefined ? `• ${server.toolCount} tools` : ''}
            </p>
          </div>
          <div class="flex gap-1">
            <button class="reconnect-mcp-btn p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-server-name="${this.escapeHtml(server.name)}" title="Reconnect">
              <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button class="edit-mcp-btn p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-server-name="${this.escapeHtml(server.name)}" title="Edit server">
              <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="delete-mcp-btn p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-server-name="${this.escapeHtml(server.name)}" title="Delete server">
              <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderMCPToolsList(): string {
    if (this.mcpTools.length === 0) {
      return `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8 m-0">
          No MCP tools discovered. Connect to an MCP server to see tools here.
        </p>
      `;
    }

    return this.mcpTools.map(tool => {
      return `
        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${!tool.enabled ? 'opacity-60' : ''}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${this.escapeHtml(tool.name)}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                ${this.escapeHtml(tool.mcpServerName || '')}
              </span>
              ${tool.isStreamable ? '<span class="text-xs px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">Streamable</span>' : ''}
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">${this.escapeHtml(tool.description)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderToolsList(): string {
    if (this.tools.length === 0) {
      return `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8 m-0">
          No tools yet. Click "Add Tool" to create one.
        </p>
      `;
    }

    return this.tools.map(tool => {
      const environment = tool.environment || 'node';
      const envBadgeClass = environment === 'browser'
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';

      return `
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
                  data-tool-name="${this.escapeHtml(tool.name)}" title="Edit tool">
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
    `;
    }).join('');
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Tab buttons
    const tabCustom = this.querySelector('#tab-custom');
    if (tabCustom) {
      const newTab = tabCustom.cloneNode(true);
      tabCustom.replaceWith(newTab);
      (newTab as HTMLElement).addEventListener('click', () => this.switchTab('custom'));
    }

    const tabMcp = this.querySelector('#tab-mcp');
    if (tabMcp) {
      const newTab = tabMcp.cloneNode(true);
      tabMcp.replaceWith(newTab);
      (newTab as HTMLElement).addEventListener('click', () => this.switchTab('mcp'));
    }

    // Custom tool form handlers
    if (this.activeTab === 'custom') {
      this.attachCustomToolListeners();
    } else {
      this.attachMCPListeners();
    }
  }

  private attachCustomToolListeners(): void {
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

  private attachMCPListeners(): void {
    // Add MCP server button
    const addMCPServerBtn = this.querySelector('#add-mcp-server-btn');
    if (addMCPServerBtn) {
      const newBtn = addMCPServerBtn.cloneNode(true);
      addMCPServerBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.showAddMCPForm());
    }

    // Cancel MCP form button
    const cancelMCPFormBtn = this.querySelector('#cancel-mcp-form-btn');
    if (cancelMCPFormBtn) {
      const newBtn = cancelMCPFormBtn.cloneNode(true);
      cancelMCPFormBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.hideMCPForm());
    }

    // Test connection button
    const testMCPConnectionBtn = this.querySelector('#test-mcp-connection-btn');
    if (testMCPConnectionBtn) {
      const newBtn = testMCPConnectionBtn.cloneNode(true);
      testMCPConnectionBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.testMCPConnection());
    }

    // Save MCP server button
    const saveMCPServerBtn = this.querySelector('#save-mcp-server-btn');
    if (saveMCPServerBtn) {
      const newBtn = saveMCPServerBtn.cloneNode(true);
      saveMCPServerBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.saveMCPServer());
    }

    // Edit MCP buttons
    this.querySelectorAll('.edit-mcp-btn').forEach(btn => {
      const serverName = btn.getAttribute('data-server-name');
      if (!serverName) return;
      btn.addEventListener('click', () => this.showEditMCPForm(serverName));
    });

    // Delete MCP buttons
    this.querySelectorAll('.delete-mcp-btn').forEach(btn => {
      const serverName = btn.getAttribute('data-server-name');
      if (!serverName) return;
      btn.addEventListener('click', () => this.deleteMCPServer(serverName));
    });

    // Reconnect MCP buttons
    this.querySelectorAll('.reconnect-mcp-btn').forEach(btn => {
      const serverName = btn.getAttribute('data-server-name');
      if (!serverName) return;
      btn.addEventListener('click', () => this.reconnectMCPServer(serverName));
    });
  }

  private switchTab(tab: 'custom' | 'mcp'): void {
    this.activeTab = tab;
    this.render();
  }

  private async loadTools(): Promise<void> {
    try {
      this.tools = await this.api.getTools();
      // Extract MCP tools
      this.mcpTools = this.tools.filter(t => t.toolType === 'mcp');
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }

  private async loadMCPServers(): Promise<void> {
    try {
      this.mcpServers = await this.api.getMCPServers();
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  }

  private showAddMCPForm(): void {
    this.editingMCPServer = null;
    const form = this.querySelector('#mcp-server-form');
    const formTitle = this.querySelector('#mcp-form-title');
    if (form) form.classList.remove('hidden');
    if (formTitle) formTitle.textContent = 'Add MCP Server';

    // Clear form
    const configTextarea = this.querySelector('#mcp-config-json') as HTMLTextAreaElement;
    if (configTextarea) {
      configTextarea.value = JSON.stringify({
        name: '',
        transport: 'streamable-http',
        url: '',
        headers: {
          'x-api-key': ''
        }
      }, null, 2);
    }
  }

  private showEditMCPForm(serverName: string): void {
    const server = this.mcpServers.find(s => s.name === serverName);
    if (!server) return;

    this.editingMCPServer = server;
    const form = this.querySelector('#mcp-server-form');
    const formTitle = this.querySelector('#mcp-form-title');
    if (form) form.classList.remove('hidden');
    if (formTitle) formTitle.textContent = 'Edit MCP Server';

    // Populate form
    const configTextarea = this.querySelector('#mcp-config-json') as HTMLTextAreaElement;
    if (configTextarea) {
      configTextarea.value = JSON.stringify(server, null, 2);
    }
  }

  private hideMCPForm(): void {
    const form = this.querySelector('#mcp-server-form');
    if (form) form.classList.add('hidden');
    this.editingMCPServer = null;
  }

  private async testMCPConnection(): Promise<void> {
    const configTextarea = this.querySelector('#mcp-config-json') as HTMLTextAreaElement;
    if (!configTextarea) return;

    let config: MCPServerConfig;
    try {
      config = JSON.parse(configTextarea.value);
    } catch (error: any) {
      alert(`Invalid JSON configuration: ${error.message}`);
      return;
    }

    try {
      const discoveredTools = await this.api.testMCPServer(config);
      alert(`Connection successful! Discovered ${discoveredTools.length} tools:\n${discoveredTools.map(t => `  - ${t.name}`).join('\n')}`);
    } catch (error: any) {
      alert(`Connection failed: ${error.message}`);
    }
  }

  private async saveMCPServer(): Promise<void> {
    const configTextarea = this.querySelector('#mcp-config-json') as HTMLTextAreaElement;
    if (!configTextarea) return;

    let config: MCPServerConfig;
    try {
      config = JSON.parse(configTextarea.value);
    } catch (error: any) {
      alert(`Invalid JSON configuration: ${error.message}`);
      return;
    }

    try {
      if (this.editingMCPServer) {
        await this.api.updateMCPServer(this.editingMCPServer.name, config);
      } else {
        await this.api.addMCPServer(config);
      }

      await this.loadMCPServers();
      await this.loadTools(); // Reload tools to include discovered MCP tools
      this.hideMCPForm();
      this.render();
    } catch (error: any) {
      alert(`Error saving MCP server: ${error.message}`);
    }
  }

  private async deleteMCPServer(serverName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete MCP server "${serverName}"?`)) {
      return;
    }

    try {
      await this.api.removeMCPServer(serverName);
      await this.loadMCPServers();
      await this.loadTools(); // Reload tools to remove MCP tools from deleted server
      this.render();
    } catch (error: any) {
      alert(`Error deleting MCP server: ${error.message}`);
    }
  }

  private async reconnectMCPServer(serverName: string): Promise<void> {
    try {
      const discoveredTools = await this.api.reconnectMCPServer(serverName);
      await this.loadMCPServers();
      await this.loadTools();
      this.render();
      alert(`Reconnected successfully! Discovered ${discoveredTools.length} tools.`);
    } catch (error: any) {
      alert(`Reconnection failed: ${error.message}`);
      await this.loadMCPServers(); // Update UI to show disconnected status
      this.render();
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
      (formElement.elements.namedItem('environment') as HTMLSelectElement).value = tool.environment || 'node';
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
        environment: (formData.get('environment') as string) || 'node',
        enabled: (formData.get('enabled') as string) === 'on',
        createdAt: this.editingTool?.createdAt || Date.now(),
        updatedAt: this.editingTool ? Date.now() : undefined
      };

      if (this.editingTool) {
        await this.api.updateTool(this.editingTool.name, toolData);
      } else {
        await this.api.addTool(toolData);
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
      await this.api.removeTool(toolName);
      await this.loadTools();
      this.render();
    } catch (error: any) {
      alert(`Error deleting tool: ${error.message}`);
    }
  }

  private async testTool(): Promise<void> {
    // Collect current form data
    const code = (this.querySelector('#tool-code') as HTMLTextAreaElement).value;
    const parametersText = (this.querySelector('#tool-parameters') as HTMLTextAreaElement).value;
    const name = (this.querySelector('#tool-name') as HTMLInputElement)?.value || 'Test Tool';
    const description = (this.querySelector('#tool-description') as HTMLInputElement)?.value || '';
    const timeout = (this.querySelector('#tool-timeout') as HTMLInputElement)?.value || '30000';
    const environment = (this.querySelector('#tool-environment') as HTMLSelectElement)?.value || 'node';

    // Validate and parse tool data
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

    // Open test dialog
    const dialog = document.createElement('tool-test-dialog') as HTMLElement;
    dialog.dataset.tool = JSON.stringify(toolData);
    document.body.appendChild(dialog);

    // Listen for dialog close
    dialog.addEventListener('tool-test-dialog-close', () => {
      dialog.remove();
    });
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
