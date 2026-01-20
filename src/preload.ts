import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Agent, APIKey, Tool, ToolExecutionRequest, App } from './global.d.ts';

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

  // ============ API KEY METHODS ============

  // Get all API keys
  getAPIKeys: () => ipcRenderer.invoke('api-keys:get'),

  // Add a new API key
  addAPIKey: (apiKey: APIKey) => ipcRenderer.invoke('api-keys:add', apiKey),

  // Remove an API key
  removeAPIKey: (name: string) => ipcRenderer.invoke('api-keys:remove', name),

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

  // ============ CHAT METHODS ============

  // Send chat message (non-streaming)
  sendChatMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths?: string[]
  ) => ipcRenderer.invoke('chat:sendMessage', projectPath, agentName, message, filePaths),

  // Stream chat message
  streamChatMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    let completed = false;

    // Set up IPC listeners for streaming events
    const chunkListener = (_event: Electron.IpcRendererEvent, chunk: string) => onChunk(chunk);
    const completeListener = () => {
      if (!completed) {
        completed = true;
        onComplete();
        // Clean up all listeners after completion
        ipcRenderer.removeListener('chat-chunk', chunkListener);
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
        ipcRenderer.removeListener('chat-complete', completeListener);
        ipcRenderer.removeListener('chat-error', errorListener);
      }
    };

    ipcRenderer.on('chat-chunk', chunkListener);
    ipcRenderer.on('chat-complete', completeListener);
    ipcRenderer.on('chat-error', errorListener);

    // Invoke the streaming handler
    return ipcRenderer.invoke('chat:streamMessage', projectPath, agentName, message, filePaths)
      .catch((error) => {
        // Handle promise rejection (e.g., if the main process handler throws)
        if (!completed) {
          completed = true;
          onError(error.message || String(error));
          // Clean up all listeners
          ipcRenderer.removeListener('chat-chunk', chunkListener);
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
