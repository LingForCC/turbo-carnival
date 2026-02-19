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
   * Get all projects from the configured project folder
   */
  getProjects: () => {
    return getElectronAPI().getProjects();
  },

  /**
   * Refresh projects (manual refresh trigger)
   */
  refreshProjects: () => {
    return getElectronAPI().refreshProjects();
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

  /**
   * Listen for project list changes
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
