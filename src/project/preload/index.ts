import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const projectManagement = {
  // Get all projects from the configured project folder
  getProjects: () => ipcRenderer.invoke('projects:get'),

  // Refresh projects (manual refresh)
  refreshProjects: () => ipcRenderer.invoke('projects:refresh'),

  // Get file tree for a project
  getFileTree: (projectPath: string, options?: any) =>
    ipcRenderer.invoke('project:getFileTree', projectPath, options),

  // List all .txt and .md files in project
  listProjectFiles: (projectPath: string, options?: any) =>
    ipcRenderer.invoke('files:list', projectPath, options),

  // Read multiple files at once
  readFileContents: (filePaths: string[]) =>
    ipcRenderer.invoke('files:readContents', filePaths),

  // Save assistant message to project folder
  saveMessageToFile: (projectPath: string, content: string) =>
    ipcRenderer.invoke('file:saveToProject', projectPath, content),

  // Listen for project file updates
  onProjectFileUpdated: (callback: (data: { projectPath: string; filePath: string }) => void) => {
    ipcRenderer.on('project-file-updated', (_event, data) => callback(data));
  },

  // Listen for project list changes (when subfolders are added/removed)
  onProjectsChanged: (callback: () => void) => {
    ipcRenderer.on('projects:changed', () => callback());
  },
};
