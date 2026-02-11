import type {
  ToolManagementAPI,
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  BrowserToolExecutionRequest,
  MCPServerConfig
} from '../types/tool-management';

/**
 * Tool Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Tool Management API implementation for renderer components
 */
const apiInstance: ToolManagementAPI = {
  /**
   * Get all tools
   */
  getTools: () => {
    return getElectronAPI().getTools();
  },

  /**
   * Add a new tool
   */
  addTool: (tool: Tool) => {
    return getElectronAPI().addTool(tool);
  },

  /**
   * Update an existing tool
   */
  updateTool: (toolName: string, tool: Tool) => {
    return getElectronAPI().updateTool(toolName, tool);
  },

  /**
   * Remove a tool
   */
  removeTool: (toolName: string) => {
    return getElectronAPI().removeTool(toolName);
  },

  /**
   * Execute a tool
   */
  executeTool: (request: ToolExecutionRequest) => {
    return getElectronAPI().executeTool(request);
  },

  /**
   * Listen for browser tool execution requests from main process
   */
  onBrowserToolExecution: (callback: (request: BrowserToolExecutionRequest) => void) => {
    return getElectronAPI().onBrowserToolExecution(callback);
  },

  /**
   * Send browser tool execution result back to main process
   */
  sendBrowserToolResult: (result: ToolExecutionResult) => {
    return getElectronAPI().sendBrowserToolResult(result);
  },

  /**
   * Get all MCP server configurations
   */
  getMCPServers: () => {
    return getElectronAPI().getMCPServers();
  },

  /**
   * Add a new MCP server configuration
   */
  addMCPServer: (config: MCPServerConfig) => {
    return getElectronAPI().addMCPServer(config);
  },

  /**
   * Update an existing MCP server configuration
   */
  updateMCPServer: (name: string, config: MCPServerConfig) => {
    return getElectronAPI().updateMCPServer(name, config);
  },

  /**
   * Remove an MCP server configuration
   */
  removeMCPServer: (name: string) => {
    return getElectronAPI().removeMCPServer(name);
  },

  /**
   * Test connection to an MCP server (without saving)
   */
  testMCPServer: (config: MCPServerConfig) => {
    return getElectronAPI().testMCPServer(config);
  },

  /**
   * Reconnect to an MCP server
   */
  reconnectMCPServer: (name: string) => {
    return getElectronAPI().reconnectMCPServer(name);
  },

  /**
   * Disconnect from an MCP server
   */
  disconnectMCPServer: (name: string) => {
    return getElectronAPI().disconnectMCPServer(name);
  },

  /**
   * Listen for streaming tool execution chunks
   */
  onToolStreamChunk: (callback: (chunk: { toolName: string; chunk: string }) => void) => {
    return getElectronAPI().onToolStreamChunk(callback);
  },
};

/**
 * Get the ToolManagementAPI instance
 * Returns a singleton instance that implements ToolManagementAPI interface
 */
export function getToolManagementAPI(): ToolManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const toolManagementAPI = apiInstance;
