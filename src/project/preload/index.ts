import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const projectManagement = {
  // Get file tree for the root folder
  getFileTree: (options?: any) => ipcRenderer.invoke('projects:getFileTree', options),

  // Refresh file tree (manual refresh trigger)
  refreshFileTree: (options?: any) => ipcRenderer.invoke('projects:refreshFileTree', options),

  // Get file tree for a specific directory path
  getDirectoryFileTree: (dirPath: string, options?: any) => ipcRenderer.invoke('project:getFileTree', dirPath, options),

  // List all .txt and .md files in a directory
  listProjectFiles: (projectPath: string, options?: any) => ipcRenderer.invoke('files:list', projectPath, options),

  // Read multiple files at once
  readFileContents: (filePaths: string[]) => ipcRenderer.invoke('files:readContents', filePaths),

  // Save assistant message to project folder
  saveMessageToFile: (projectPath: string, content: string) => ipcRenderer.invoke('file:saveToProject', projectPath, content),

  // Listen for project file updates
  onProjectFileUpdated: (callback: (data: { projectPath: string; filePath: string }) => void) => {
    ipcRenderer.on('project-file-updated', (_event, data) => callback(data));
  },

  // Listen for file tree changes
  onProjectsChanged: (callback: () => void) => {
    ipcRenderer.on('projects:changed', () => callback());
  },
};
