import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Agent, APIKey } from './global.d.ts';

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

  // ============ PROJECT DETAIL METHODS ============

  // Get file tree for a project
  getFileTree: (projectPath: string, options?: any) =>
    ipcRenderer.invoke('project:getFileTree', projectPath, options),

  // ============ CHAT METHODS ============

  // Send chat message (non-streaming)
  sendChatMessage: (projectPath: string, agentName: string, message: string) =>
    ipcRenderer.invoke('chat:sendMessage', projectPath, agentName, message),

  // Stream chat message
  streamChatMessage: (
    projectPath: string,
    agentName: string,
    message: string,
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
    return ipcRenderer.invoke('chat:streamMessage', projectPath, agentName, message)
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
});
