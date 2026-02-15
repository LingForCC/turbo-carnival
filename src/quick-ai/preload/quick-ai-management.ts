import { ipcRenderer } from 'electron';
import type { ToolCallEvent } from '../types/tool-management';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const quickAIManagement = {
  // Get the in-memory Quick AI agent
  getAgent: () => ipcRenderer.invoke('quick-ai:getAgent'),

  // Stream AI message with callbacks
  streamMessage: (
    message: string,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ) => {
    let completed = false;

    // Set up IPC listeners for streaming events
    const chunkListener = (_event: Electron.IpcRendererEvent, chunk: string) => onChunk(chunk);
    const reasoningListener = (_event: Electron.IpcRendererEvent, reasoning: string) => onReasoning(reasoning);
    const completeListener = (_event: Electron.IpcRendererEvent, content: string) => {
      if (!completed) {
        completed = true;
        onComplete(content);
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
    return ipcRenderer.invoke('quick-ai:streamMessage', message)
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

  // Clear conversation history
  clearHistory: () => ipcRenderer.invoke('quick-ai:clearHistory'),

  // Validate settings
  validateSettings: () => ipcRenderer.invoke('quick-ai:validateSettings'),

  // Listen for window shown event (one-way IPC from main to renderer)
  onWindowShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('quick-ai:windowShown', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('quick-ai:windowShown', listener);
  },

  // Listen for tool call events from main process during Quick AI streaming
  onToolCallEvent: (callback: (event: ToolCallEvent) => void) => {
    ipcRenderer.on('quick-ai:toolCall', (_event, toolEvent) => callback(toolEvent));
  },
};
