import { contextBridge, ipcRenderer } from 'electron';
import type { Tool, ToolExecutionRequest, AppSettings } from './global.d.ts';
import { projectManagement } from './preload/project-management';
import { agentManagement } from './preload/agent-management';
import { providerManagement } from './preload/provider-management';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  ...projectManagement,

  ...agentManagement,

  ...providerManagement,

  // ============ TOOL METHODS ============

  // Get all tools
  getTools: () => ipcRenderer.invoke('tools:get'),

  // Add a new tool
  addTool: (tool: Tool) => ipcRenderer.invoke('tools:add', tool),

  // Update an existing tool
  updateTool: (toolName: string, tool: Tool) =>
    ipcRenderer.invoke('tools:update', toolName, tool),

  // Remove a tool
  removeTool: (toolName: string) => ipcRenderer.invoke('tools:remove', toolName),

  // Execute a tool
  executeTool: (request: ToolExecutionRequest) =>
    ipcRenderer.invoke('tools:execute', request),

  // Listen for browser tool execution requests from main process
  onBrowserToolExecution: (callback: (request: { code: string; parameters: Record<string, any>; timeout: number }) => void) => {
    ipcRenderer.on('tools:executeBrowser', (_event, request) => callback(request));
  },

  // Send browser tool execution result back to main process
  sendBrowserToolResult: (result: { success: boolean; result?: any; error?: string; executionTime: number }) => {
    ipcRenderer.send('tools:browserResult', result);
  },

  // ============ SETTINGS METHODS ============

  // Get all settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Update settings (supports partial updates)
  updateSettings: (updates: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:update', updates),
});
