import { ipcRenderer } from 'electron';
import type { Agent } from '../types/agent-management';
import type { ToolCallEvent } from '../global.d';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const agentManagement = {
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

  // Listen for tool call events from main process during chat-agent streaming
  onToolCallEvent: (callback: (event: ToolCallEvent) => void) => {
    ipcRenderer.on('chat-agent:toolCall', (_event, toolEvent) => callback(toolEvent));
  },
};
