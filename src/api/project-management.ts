import type { ProjectManagementAPI, FileTreeOptions, FileListOptions } from './project-management.d';

/**
 * Project Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Project Management API implementation for renderer components
 */
const apiInstance: ProjectManagementAPI = {
  /**
   * Open folder picker dialog
   */
  openFolderDialog: (): Promise<string | null> => {
    return getElectronAPI().openFolderDialog();
  },

  /**
   * Get all saved projects
   */
  getProjects: () => {
    return getElectronAPI().getProjects();
  },

  /**
   * Add a new project
   */
  addProject: (folderPath: string) => {
    return getElectronAPI().addProject(folderPath);
  },

  /**
   * Remove a project
   */
  removeProject: (folderPath: string) => {
    return getElectronAPI().removeProject(folderPath);
  },

  /**
   * Get file tree for a project
   */
  getFileTree: (projectPath: string, options?: FileTreeOptions) => {
    return getElectronAPI().getFileTree(projectPath, options);
  },

  /**
   * List all .txt and .md files in project
   */
  listProjectFiles: (projectPath: string, options?: FileListOptions) => {
    return getElectronAPI().listProjectFiles(projectPath, options);
  },

  /**
   * Read multiple files at once
   */
  readFileContents: (filePaths: string[]) => {
    return getElectronAPI().readFileContents(filePaths);
  },

  /**
   * Save assistant message to project folder
   */
  saveMessageToFile: (projectPath: string, content: string) => {
    return getElectronAPI().saveMessageToFile(projectPath, content);
  },

  /**
   * Listen for project file updates
   */
  onProjectFileUpdated: (callback: (data: { projectPath: string; filePath: string }) => void) => {
    return getElectronAPI().onProjectFileUpdated(callback);
  },
};

/**
 * Get the ProjectManagementAPI instance
 * Returns a singleton instance that implements ProjectManagementAPI interface
 */
export function getProjectManagementAPI(): ProjectManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const projectManagementAPI = apiInstance;

