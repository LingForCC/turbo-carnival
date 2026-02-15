import type { SettingsManagementAPI, AppSettings } from '../types';

/**
 * Settings Management API for Renderer Components
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
 * Settings Management API implementation for renderer components
 */
const apiInstance: SettingsManagementAPI = {
  /**
   * Get all settings
   */
  getSettings: (): Promise<AppSettings> => {
    return getElectronAPI().getSettings();
  },

  /**
   * Update settings (supports partial updates)
   */
  updateSettings: (updates: Partial<AppSettings>): Promise<AppSettings> => {
    return getElectronAPI().updateSettings(updates);
  },

  /**
   * Open folder picker dialog
   */
  openFolderDialog: (): Promise<string | null> => {
    return getElectronAPI().openFolderDialog();
  },
};

/**
 * Get the SettingsManagementAPI instance
 * Returns a singleton instance that implements SettingsManagementAPI interface
 */
export function getSettingsManagementAPI(): SettingsManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const settingsManagementAPI = apiInstance;

// Re-export types for convenience
export type { AppSettings, SettingsManagementAPI } from '../types';
