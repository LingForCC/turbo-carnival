import { getToolManagementAPI } from '../api';
import { getSettingsManagementAPI } from '../../settings/api';
import type { ToolManagementAPI, Tool, MCPServerConfig, MCPToolsFeatureSettings } from '../types';
import { registerFeatureSettingsRenderer } from '../../settings/components/settings-dialog';

// Register this panel as a child tab under 'ai' at module load time
registerFeatureSettingsRenderer<MCPToolsFeatureSettings>({
  featureId: 'mcp-tools',
  displayName: 'MCP Tools',
  order: 40,
  defaults: { servers: [] },
  panelTagName: 'mcp-tools-settings-panel',
  parentTab: 'ai'
});

/**
 * MCPToolsSettingsPanel Web Component
 * Panel for managing MCP servers as a child tab within AI Settings
 */
export class MCPToolsSettingsPanel extends HTMLElement {
  private settingsAPI = getSettingsManagementAPI();
  private toolAPI: ToolManagementAPI;
  private mcpServers: MCPServerConfig[] = [];
  private mcpTools: Tool[] = [];
  private editingMCPServer: MCPServerConfig | null = null;
  private editingMCPServerIndex: number = -1;
  private isLoading = true;

  constructor() {
    super();
    this.toolAPI = getToolManagementAPI();
  }

  async connectedCallback(): Promise<void> {
    this.renderLoading();
    await this.loadMCPServers();
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
    this.innerHTML = `
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
          ${this.renderMCPServersListWithForm()}
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
      </div>
    `;

    this.attachEventListeners();
  }

  private renderMCPServersListWithForm(): string {
    const isAdding = this.editingMCPServerIndex === -1 && this.editingMCPServer !== null;

    if (this.mcpServers.length === 0 && !isAdding) {
      return `
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8 m-0">
          No MCP servers configured. Click "Add Server" to connect to an MCP server.
        </p>
      `;
    }

    const parts: string[] = [];

    if (isAdding) {
      parts.push(this.renderMCPServerForm('Add MCP Server'));
    }

    this.mcpServers.forEach((server, index) => {
      const statusClass = server.connected
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

      parts.push(`
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
            <button class="${server.connected ? 'disconnect-mcp-btn' : 'connect-mcp-btn'} p-1.5 ${server.connected ? 'hover:bg-orange-100 dark:hover:bg-orange-900/30' : 'hover:bg-green-100 dark:hover:bg-green-900/30'} rounded cursor-pointer border-0 bg-transparent"
                    data-server-name="${this.escapeHtml(server.name)}" title="${server.connected ? 'Disconnect' : 'Connect'}">
              <svg class="w-4 h-4 ${server.connected ? 'text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${server.connected
                  ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>'
                  : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>'
                }
              </svg>
            </button>
            <button class="edit-mcp-btn p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer border-0 bg-transparent"
                    data-server-name="${this.escapeHtml(server.name)}" data-server-index="${index}" title="Edit server">
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
      `);

      if (this.editingMCPServerIndex === index && this.editingMCPServer !== null) {
        parts.push(this.renderMCPServerForm('Edit MCP Server'));
      }
    });

    return parts.join('');
  }

  private renderMCPServerForm(title: string): string {
    const server = this.editingMCPServer;
    const configJson = server ? JSON.stringify(server, null, 2) : JSON.stringify({
      name: '',
      transport: 'streamable-http',
      url: '',
      headers: {
        'x-api-key': ''
      }
    }, null, 2);

    return `
      <div id="mcp-server-form" class="mt-2 mb-2 p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 m-0">${title}</h4>
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
}'>${this.escapeHtml(configJson)}</textarea>
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
    `;
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

  private attachEventListeners(): void {
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

    // Connect MCP buttons
    this.querySelectorAll('.connect-mcp-btn').forEach(btn => {
      const serverName = btn.getAttribute('data-server-name');
      if (!serverName) return;
      btn.addEventListener('click', () => this.toggleMCPServer(serverName, true));
    });

    // Disconnect MCP buttons
    this.querySelectorAll('.disconnect-mcp-btn').forEach(btn => {
      const serverName = btn.getAttribute('data-server-name');
      if (!serverName) return;
      btn.addEventListener('click', () => this.toggleMCPServer(serverName, false));
    });
  }

  private async loadTools(): Promise<void> {
    try {
      const tools = await this.toolAPI.getTools();
      this.mcpTools = tools.filter(t => t.toolType === 'mcp');
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }

  private async loadMCPServers(): Promise<void> {
    try {
      // Load server configs from settings (without runtime status)
      const settings = await this.settingsAPI.getFeatureSettings<MCPToolsFeatureSettings>('mcp-tools');
      const savedServers = settings.servers || [];

      // Get runtime status from tool API
      const runtimeServers = await this.toolAPI.getMCPServers();

      // Merge saved configs with runtime status
      this.mcpServers = savedServers.map(saved => {
        const runtime = runtimeServers.find(r => r.name === saved.name);
        return {
          ...saved,
          connected: runtime?.connected || false,
          toolCount: runtime?.toolCount
        };
      });
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      this.mcpServers = [];
    }
  }

  private async saveMCPServersToSettings(): Promise<void> {
    // Only save persistent fields (exclude runtime-only fields like connected, toolCount)
    const serversToSave = this.mcpServers.map(server => ({
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      url: server.url,
      env: server.env,
      headers: server.headers
    }));

    await this.settingsAPI.updateFeatureSettings<MCPToolsFeatureSettings>('mcp-tools', {
      servers: serversToSave
    });
  }

  private showAddMCPForm(): void {
    this.editingMCPServerIndex = -1;
    this.editingMCPServer = {} as MCPServerConfig;
    this.render();
  }

  private showEditMCPForm(serverName: string): void {
    const serverIndex = this.mcpServers.findIndex(s => s.name === serverName);
    const server = this.mcpServers[serverIndex];
    if (!server) return;

    this.editingMCPServerIndex = serverIndex;
    this.editingMCPServer = { ...server };
    this.render();
  }

  private hideMCPForm(): void {
    this.editingMCPServerIndex = -1;
    this.editingMCPServer = null;
    this.render();
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
      const discoveredTools = await this.toolAPI.testMCPServer(config);
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

    // Validate config
    const validationError = this.validateMCPServerConfig(config);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      if (this.editingMCPServerIndex >= 0 && this.editingMCPServer) {
        // Check for duplicate name if name changed
        if (config.name !== this.editingMCPServer.name) {
          if (this.mcpServers.some(s => s.name === config.name)) {
            alert(`MCP server with name "${config.name}" already exists`);
            return;
          }
        }

        // Disconnect old server if connected
        if (this.editingMCPServer.connected) {
          await this.toolAPI.disconnectMCPServer(this.editingMCPServer.name);
        }

        // Update in list
        const index = this.mcpServers.findIndex(s => s.name === this.editingMCPServer!.name);
        if (index !== -1) {
          this.mcpServers[index] = { ...config, connected: false };
        }
      } else {
        // Check for duplicate name
        if (this.mcpServers.some(s => s.name === config.name)) {
          alert(`MCP server with name "${config.name}" already exists`);
          return;
        }

        // Add new server
        this.mcpServers.push({ ...config, connected: false });
      }

      // Save to settings
      await this.saveMCPServersToSettings();

      // Try to connect to discover tools
      try {
        await this.toolAPI.reconnectMCPServer(config.name);
      } catch (error) {
        console.error('Failed to connect after save:', error);
      }

      await this.loadMCPServers();
      await this.loadTools();
      this.hideMCPForm();
    } catch (error: any) {
      alert(`Error saving MCP server: ${error.message}`);
    }
  }

  private async deleteMCPServer(serverName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete MCP server "${serverName}"?`)) {
      return;
    }

    try {
      // Disconnect from server if connected
      const server = this.mcpServers.find(s => s.name === serverName);
      if (server?.connected) {
        await this.toolAPI.disconnectMCPServer(serverName);
      }

      // Remove from list
      this.mcpServers = this.mcpServers.filter(s => s.name !== serverName);

      // Save to settings
      await this.saveMCPServersToSettings();

      await this.loadTools();
      this.render();
    } catch (error: any) {
      alert(`Error deleting MCP server: ${error.message}`);
    }
  }

  private async toggleMCPServer(serverName: string, connect: boolean): Promise<void> {
    if (connect) {
      try {
        const discoveredTools = await this.toolAPI.reconnectMCPServer(serverName);
        await this.loadMCPServers();
        await this.loadTools();
        this.render();
        alert(`Connected successfully! Discovered ${discoveredTools.length} tools.`);
      } catch (error: any) {
        alert(`Connection failed: ${error.message}`);
        await this.loadMCPServers();
        this.render();
      }
    } else {
      try {
        await this.toolAPI.disconnectMCPServer(serverName);
        await this.loadMCPServers();
        await this.loadTools();
        this.render();
      } catch (error: any) {
        alert(`Disconnection failed: ${error.message}`);
        await this.loadMCPServers();
        this.render();
      }
    }
  }

  private validateMCPServerConfig(config: any): string | null {
    if (!config.name || typeof config.name !== 'string') {
      return 'Server name is required and must be a string';
    }

    if (!config.transport || typeof config.transport !== 'string') {
      return 'Transport type is required and must be a string';
    }

    if (config.transport !== 'stdio' && config.transport !== 'streamable-http') {
      return 'Transport must be either "stdio" or "streamable-http"';
    }

    if (config.transport === 'stdio') {
      if (!config.command || typeof config.command !== 'string') {
        return 'stdio transport requires a command';
      }
      if (config.args && !Array.isArray(config.args)) {
        return 'args must be an array';
      }
    }

    if (config.transport === 'streamable-http') {
      if (!config.url || typeof config.url !== 'string') {
        return 'streamable-http transport requires a url';
      }
      try {
        new URL(config.url);
      } catch {
        return 'url must be a valid URL';
      }
    }

    if (config.env && typeof config.env !== 'object') {
      return 'env must be an object';
    }

    if (config.headers && typeof config.headers !== 'object') {
      return 'headers must be an object';
    }

    return null;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('mcp-tools-settings-panel', MCPToolsSettingsPanel);
