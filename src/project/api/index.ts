import type { ProjectManagementAPI, FileTreeOptions, FileListOptions } from '../types';

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
   * Get file tree for the root folder
   */
  getFileTree: (options?: FileTreeOptions) => {
    return getElectronAPI().getFileTree(options);
  },

  /**
   * Refresh file tree (manual refresh trigger)
   */
  refreshFileTree: (options?: FileTreeOptions) => {
    return getElectronAPI().refreshFileTree(options);
  },

  /**
   * Get file tree for a specific directory
   */
  getDirectoryFileTree: (dirPath: string, options?: FileTreeOptions) => {
    return getElectronAPI().getDirectoryFileTree(dirPath, options);
  },

  /**
   * List all .txt and .md files in directory
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

  /**
   * Listen for file tree changes
   */
  onProjectsChanged: (callback: () => void) => {
    return getElectronAPI().onProjectsChanged(callback);
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
