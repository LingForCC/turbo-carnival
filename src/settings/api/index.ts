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
 * Extended Settings Management API with feature settings support
 */
export interface ExtendedSettingsManagementAPI extends SettingsManagementAPI {
  /**
   * Get settings for a specific feature
   * @param featureId - The feature identifier
   * @returns Promise resolving to the feature's settings
   */
  getFeatureSettings<T = Record<string, any>>(featureId: string): Promise<T>;

  /**
   * Update settings for a specific feature
   * @param featureId - The feature identifier
   * @param updates - Partial updates to the feature's settings
   * @returns Promise resolving to the updated app settings
   */
  updateFeatureSettings<T = Record<string, any>>(featureId: string, updates: Partial<T>): Promise<AppSettings>;
}

/**
 * Settings Management API implementation for renderer components
 */
const apiInstance: ExtendedSettingsManagementAPI = {
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
   * Get settings for a specific feature
   */
  getFeatureSettings: <T = Record<string, any>>(featureId: string): Promise<T> => {
    return getElectronAPI().getFeatureSettings(featureId) as Promise<T>;
  },

  /**
   * Update settings for a specific feature
   */
  updateFeatureSettings: <T = Record<string, any>>(featureId: string, updates: Partial<T>): Promise<AppSettings> => {
    return getElectronAPI().updateFeatureSettings(featureId, updates as Record<string, any>);
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
 * Returns a singleton instance that implements ExtendedSettingsManagementAPI interface
 */
export function getSettingsManagementAPI(): ExtendedSettingsManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const settingsManagementAPI = apiInstance;

// Re-export types for convenience
export type { AppSettings, SettingsManagementAPI } from '../types';
