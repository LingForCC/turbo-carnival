import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const toolManagement = {
  // Get all tools
  getTools: () => ipcRenderer.invoke('tools:get'),

  // Add a new tool
  addTool: (tool: any) => ipcRenderer.invoke('tools:add', tool),

  // Update an existing tool
  updateTool: (toolName: string, tool: any) =>
    ipcRenderer.invoke('tools:update', toolName, tool),

  // Remove a tool
  removeTool: (toolName: string) => ipcRenderer.invoke('tools:remove', toolName),

  // Execute a tool
  executeTool: (request: any) =>
    ipcRenderer.invoke('tools:execute', request),

  // Listen for browser tool execution requests from main process
  onBrowserToolExecution: (callback: (request: { code: string; parameters: Record<string, any>; timeout: number }) => void) => {
    ipcRenderer.on('tools:executeBrowser', (_event, request) => callback(request));
  },

  // Send browser tool execution result back to main process
  sendBrowserToolResult: (result: { success: boolean; result?: any; error?: string; executionTime: number }) => {
    ipcRenderer.send('tools:browserResult', result);
  },
};
