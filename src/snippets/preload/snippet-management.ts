import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const snippetManagement = {
  // Get list of snippet files
  getSnippetFiles: () => ipcRenderer.invoke('snippets:getFiles'),

  // Read snippet file content
  readSnippetFile: (fileName: string) => ipcRenderer.invoke('snippets:readFile', fileName),

  // Create new snippet file
  createSnippetFile: (name: string, content: string) =>
    ipcRenderer.invoke('snippets:createFile', name, content),

  // Save snippet content
  saveSnippetContent: (fileName: string, content: string) =>
    ipcRenderer.invoke('snippets:saveContent', fileName, content),

  // Rename snippet file
  renameSnippetFile: (oldName: string, newName: string) =>
    ipcRenderer.invoke('snippets:renameFile', oldName, newName),

  // Delete snippet file
  deleteSnippetFile: (fileName: string) => ipcRenderer.invoke('snippets:deleteFile', fileName),

  // Close snippet window
  closeSnippetWindow: () => ipcRenderer.send('snippets:closeWindow'),
};
