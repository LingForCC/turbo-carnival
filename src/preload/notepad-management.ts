import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const notepadManagement = {
  // Get list of notepad files
  getFiles: () => ipcRenderer.invoke('notepad:getFiles'),

  // Read notepad file content
  readFile: (filePath: string) => ipcRenderer.invoke('notepad:readFile', filePath),

  // Create new notepad file
  createFile: () => ipcRenderer.invoke('notepad:createFile'),

  // Save notepad content
  saveContent: (filePath: string, content: string) =>
    ipcRenderer.invoke('notepad:saveContent', filePath, content),

  // Delete notepad file
  deleteFile: (filePath: string) => ipcRenderer.invoke('notepad:deleteFile', filePath),

  // Listen for window shown event (one-way IPC from main to renderer)
  onWindowShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('notepad:windowShown', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('notepad:windowShown', listener);
  },
};
