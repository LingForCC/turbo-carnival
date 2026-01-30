import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Agent, LLMProvider, ModelConfig, Tool, ToolExecutionRequest, ToolCallEvent, App, AppSettings } from './global.d.ts';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  // Open folder picker dialog
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Get all saved projects
  getProjects: () => ipcRenderer.invoke('projects:get'),

  // Add a new project
  addProject: (folderPath: string) => ipcRenderer.invoke('projects:add', folderPath),

  // Remove a project
  removeProject: (folderPath: string) => ipcRenderer.invoke('projects:remove', folderPath),

  // ============ AGENT METHODS ============

  // Get all agents for a project
  getAgents: (projectPath: string) => ipcRenderer.invoke('agents:get', projectPath),

  // Add a new agent to a project
  addAgent: (projectPath: string, agent: Agent) =>
    ipcRenderer.invoke('agents:add', projectPath, agent),

  // Remove an agent from a project
  removeAgent: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('agents:remove', projectPath, agentName),

  // Update an existing agent
  updateAgent: (projectPath: string, agentName: string, agent: Agent) =>
    ipcRenderer.invoke('agents:update', projectPath, agentName, agent),

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

  // Listen for tool call events from main process during chat-agent streaming
  onToolCallEvent: (callback: (event: ToolCallEvent) => void) => {
    ipcRenderer.on('chat-agent:toolCall', (_event, toolEvent) => callback(toolEvent));
  },

  // ============ SETTINGS METHODS ============

  // Get all settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Update settings (supports partial updates)
  updateSettings: (updates: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:update', updates),

  // ============ PROJECT DETAIL METHODS ============

  // Get file tree for a project
  getFileTree: (projectPath: string, options?: any) =>
    ipcRenderer.invoke('project:getFileTree', projectPath, options),

  // List all .txt and .md files in project
  listProjectFiles: (projectPath: string, options?: any) =>
    ipcRenderer.invoke('files:list', projectPath, options),

  // Read multiple files at once
  readFileContents: (filePaths: string[]) =>
    ipcRenderer.invoke('files:readContents', filePaths),

  // ============ CHAT-AGENT METHODS ============

  // Clear chat-agent history
  clearChatAgentHistory: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('chat-agent:clearHistory', projectPath, agentName),

  // Stream chat-agent message
  streamChatAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    let completed = false;

    // Set up IPC listeners for streaming events
    const chunkListener = (_event: Electron.IpcRendererEvent, chunk: string) => onChunk(chunk);
    const reasoningListener = (_event: Electron.IpcRendererEvent, reasoning: string) => onReasoning(reasoning);
    const completeListener = () => {
      if (!completed) {
        completed = true;
        onComplete();
        // Clean up all listeners after completion
        ipcRenderer.removeListener('chat-chunk', chunkListener);
        ipcRenderer.removeListener('chat-reasoning', reasoningListener);
        ipcRenderer.removeListener('chat-complete', completeListener);
        ipcRenderer.removeListener('chat-error', errorListener);
      }
    };
    const errorListener = (_event: Electron.IpcRendererEvent, error: string) => {
      if (!completed) {
        completed = true;
        onError(error);
        // Clean up all listeners after error
        ipcRenderer.removeListener('chat-chunk', chunkListener);
        ipcRenderer.removeListener('chat-reasoning', reasoningListener);
        ipcRenderer.removeListener('chat-complete', completeListener);
        ipcRenderer.removeListener('chat-error', errorListener);
      }
    };

    ipcRenderer.on('chat-chunk', chunkListener);
    ipcRenderer.on('chat-reasoning', reasoningListener);
    ipcRenderer.on('chat-complete', completeListener);
    ipcRenderer.on('chat-error', errorListener);

    // Invoke the streaming handler
    return ipcRenderer.invoke('chat-agent:streamMessage', projectPath, agentName, message, filePaths)
      .catch((error) => {
        // Handle promise rejection (e.g., if the main process handler throws)
        if (!completed) {
          completed = true;
          onError(error.message || String(error));
          // Clean up all listeners
          ipcRenderer.removeListener('chat-chunk', chunkListener);
          ipcRenderer.removeListener('chat-reasoning', reasoningListener);
          ipcRenderer.removeListener('chat-complete', completeListener);
          ipcRenderer.removeListener('chat-error', errorListener);
        }
      });
  },

  // ============ APP-AGENT METHODS ============

  // Clear app-agent history
  clearAppAgentHistory: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('app-agent:clearHistory', projectPath, agentName),

  // Stream app-agent message
  streamAppAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    let completed = false;

    // Set up IPC listeners for streaming events
    const chunkListener = (_event: Electron.IpcRendererEvent, chunk: string) => onChunk(chunk);
    const reasoningListener = (_event: Electron.IpcRendererEvent, reasoning: string) => onReasoning(reasoning);
    const completeListener = () => {
      if (!completed) {
        completed = true;
        onComplete();
        // Clean up all listeners after completion
        ipcRenderer.removeListener('chat-chunk', chunkListener);
        ipcRenderer.removeListener('chat-reasoning', reasoningListener);
        ipcRenderer.removeListener('chat-complete', completeListener);
        ipcRenderer.removeListener('chat-error', errorListener);
      }
    };
    const errorListener = (_event: Electron.IpcRendererEvent, error: string) => {
      if (!completed) {
        completed = true;
        onError(error);
        // Clean up all listeners after error
        ipcRenderer.removeListener('chat-chunk', chunkListener);
        ipcRenderer.removeListener('chat-reasoning', reasoningListener);
        ipcRenderer.removeListener('chat-complete', completeListener);
        ipcRenderer.removeListener('chat-error', errorListener);
      }
    };

    ipcRenderer.on('chat-chunk', chunkListener);
    ipcRenderer.on('chat-reasoning', reasoningListener);
    ipcRenderer.on('chat-complete', completeListener);
    ipcRenderer.on('chat-error', errorListener);

    // Invoke the streaming handler
    return ipcRenderer.invoke('app-agent:streamMessage', projectPath, agentName, message, filePaths)
      .catch((error) => {
        // Handle promise rejection (e.g., if the main process handler throws)
        if (!completed) {
          completed = true;
          onError(error.message || String(error));
          // Clean up all listeners
          ipcRenderer.removeListener('chat-chunk', chunkListener);
          ipcRenderer.removeListener('chat-reasoning', reasoningListener);
          ipcRenderer.removeListener('chat-complete', completeListener);
          ipcRenderer.removeListener('chat-error', errorListener);
        }
      });
  },

  // ============ APP METHODS ============

  // Get app for an agent
  getApp: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('apps:get', projectPath, agentName),

  // Save or update app
  saveApp: (projectPath: string, app: App) =>
    ipcRenderer.invoke('apps:save', projectPath, app),

  // Delete app
  deleteApp: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('apps:delete', projectPath, agentName),

  // Execute app main process function
  executeAppMain: (projectPath: string, agentName: string, functionName: string, args: any[]) =>
    ipcRenderer.invoke('apps:executeMain', projectPath, agentName, functionName, args),

  // Update app data
  updateAppData: (projectPath: string, agentName: string, data: Record<string, any>) =>
    ipcRenderer.invoke('apps:updateData', projectPath, agentName, data),
});
