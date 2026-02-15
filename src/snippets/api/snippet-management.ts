import type { SnippetManagementAPI, SnippetFile } from '../types/snippet-management';

/**
 * Snippet Management API for Renderer Components
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
 * Snippet Management API implementation for renderer components
 */
const apiInstance: SnippetManagementAPI = {
  /**
   * Get list of snippet files
   */
  getSnippetFiles: (): Promise<SnippetFile[]> => {
    return getElectronAPI().getSnippetFiles();
  },

  /**
   * Read snippet file content
   */
  readSnippetFile: (fileName: string): Promise<string> => {
    return getElectronAPI().readSnippetFile(fileName);
  },

  /**
   * Create new snippet file
   */
  createSnippetFile: (name: string, content: string): Promise<SnippetFile> => {
    return getElectronAPI().createSnippetFile(name, content);
  },

  /**
   * Save snippet content
   */
  saveSnippetContent: (fileName: string, content: string): Promise<void> => {
    return getElectronAPI().saveSnippetContent(fileName, content);
  },

  /**
   * Rename snippet file
   */
  renameSnippetFile: (oldName: string, newName: string): Promise<void> => {
    return getElectronAPI().renameSnippetFile(oldName, newName);
  },

  /**
   * Delete snippet file
   */
  deleteSnippetFile: (fileName: string): Promise<void> => {
    return getElectronAPI().deleteSnippetFile(fileName);
  },
};

/**
 * Get the SnippetManagementAPI instance
 * Returns a singleton instance that implements SnippetManagementAPI interface
 */
export function getSnippetManagementAPI(): SnippetManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const snippetManagementAPI = apiInstance;

// Re-export types for convenience
export type { SnippetFile } from '../types/snippet-management';
