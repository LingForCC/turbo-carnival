import type {
  ToolManagementAPI,
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  BrowserToolExecutionRequest,
  BrowserToolExecutionResult
} from './tool-management.d';

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
  sendBrowserToolResult: (result: BrowserToolExecutionResult) => {
    return getElectronAPI().sendBrowserToolResult(result);
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
