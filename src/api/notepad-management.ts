import type { NotepadManagementAPI, NotepadFile } from '../types/notepad-management';

/**
 * Notepad Management API for Renderer Components
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
 * Notepad Management API implementation for renderer components
 */
const apiInstance: NotepadManagementAPI = {
  /**
   * Get list of notepad files
   */
  getFiles: (): Promise<NotepadFile[]> => {
    return getElectronAPI().getFiles();
  },

  /**
   * Read notepad file content
   */
  readFile: (filePath: string): Promise<string> => {
    return getElectronAPI().readFile(filePath);
  },

  /**
   * Create new notepad file
   */
  createFile: (): Promise<NotepadFile> => {
    return getElectronAPI().createFile();
  },

  /**
   * Save notepad content
   */
  saveContent: (filePath: string, content: string): Promise<void> => {
    return getElectronAPI().saveContent(filePath, content);
  },

  /**
   * Delete notepad file
   */
  deleteFile: (filePath: string): Promise<void> => {
    return getElectronAPI().deleteFile(filePath);
  },
};

/**
 * Get the NotepadManagementAPI instance
 * Returns a singleton instance that implements NotepadManagementAPI interface
 */
export function getNotepadManagementAPI(): NotepadManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const notepadManagementAPI = apiInstance;

// Re-export types for convenience
export type { NotepadFile, NotepadContent } from '../types/notepad-management';
