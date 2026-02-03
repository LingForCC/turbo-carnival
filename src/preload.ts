import { contextBridge, ipcRenderer } from 'electron';
import type { LLMProvider, ModelConfig, Tool, ToolExecutionRequest, AppSettings } from './global.d.ts';
import { projectManagement } from './preload/project-management';
import { agentManagement } from './preload/agent-management';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  ...projectManagement,

  ...agentManagement,

  // ============ PROVIDER METHODS ============

  // Get all providers
  getProviders: () => ipcRenderer.invoke('providers:get'),

  // Add a new provider
  addProvider: (provider: LLMProvider) => ipcRenderer.invoke('providers:add', provider),

  // Update an existing provider
  updateProvider: (id: string, provider: LLMProvider) =>
    ipcRenderer.invoke('providers:update', id, provider),

  // Remove a provider
  removeProvider: (id: string) => ipcRenderer.invoke('providers:remove', id),

  // Get provider by ID
  getProviderById: (id: string) => ipcRenderer.invoke('providers:getById', id),

  // ============ MODEL CONFIG METHODS ============

  // Get all model configs
  getModelConfigs: () => ipcRenderer.invoke('model-configs:get'),

  // Add a new model config
  addModelConfig: (config: ModelConfig) => ipcRenderer.invoke('model-configs:add', config),

  // Update an existing model config
  updateModelConfig: (id: string, config: ModelConfig) =>
    ipcRenderer.invoke('model-configs:update', id, config),

  // Remove a model config
  removeModelConfig: (id: string) => ipcRenderer.invoke('model-configs:remove', id),

  // Get model config by ID
  getModelConfigById: (id: string) => ipcRenderer.invoke('model-configs:getById', id),

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
