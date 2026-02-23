import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { getStoragePath } from '../../core/storage-resolver';
import type { AppSettings } from '../types';
import { getFeatureDefaults, getFeatureRegistration } from './settings-registry';

// Callback for projectFolder changes
let onProjectFolderChangedCallback: ((newFolder: string | undefined) => void) | null = null;

/**
 * Register a callback to be called when projectFolder setting changes
 */
export function setOnProjectFolderChangedCallback(callback: (newFolder: string | undefined) => void): void {
  onProjectFolderChangedCallback = callback;
}

// ============ SETTINGS STORAGE HELPERS ============

/**
 * Get the file path for settings storage
 */
export function getSettingsPath(): string {
  return getStoragePath('settings.json');
}

/**
 * Load all settings from storage
 * Returns default settings if file doesn't exist
 */
export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const settings = data.settings || { theme: 'light' };
      // Merge feature defaults with loaded settings
      return mergeFeatureDefaults(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      return mergeFeatureDefaults({ theme: 'light' });
    }
  }
  // Return default settings with feature defaults
  return mergeFeatureDefaults({ theme: 'light' });
}

/**
 * Merge feature defaults with loaded settings
 * Ensures new features get their defaults even if not in saved settings
 */
function mergeFeatureDefaults(settings: AppSettings): AppSettings {
  const featureDefaults = getFeatureDefaults();
  const existingFeatures = settings.features || {};

  // Merge defaults with existing feature settings
  const mergedFeatures = { ...featureDefaults, ...existingFeatures };

  // Only add features if there are any
  if (Object.keys(mergedFeatures).length > 0) {
    return { ...settings, features: mergedFeatures };
  }
  return settings;
}

/**
 * Save settings to storage
 */
export function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath();
  const data = { settings };
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Update specific settings fields
 */
export function updateSettingsFields(updates: Partial<AppSettings>): AppSettings {
  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, ...updates };
  saveSettings(newSettings);
  return newSettings;
}

/**
 * Get settings for a specific feature
 * @param featureId - The feature identifier
 * @returns The feature's settings or empty object if not found
 */
export function getFeatureSettings<T = any>(featureId: string): T {
  const settings = loadSettings();
  const registration = getFeatureRegistration(featureId);

  if (!registration) {
    console.warn(`Feature "${featureId}" is not registered. Returning empty settings.`);
    return {} as T;
  }

  const featureSettings = settings.features?.[featureId];
  return { ...registration.defaults, ...featureSettings } as T;
}

/**
 * Update settings for a specific feature
 * @param featureId - The feature identifier
 * @param updates - Partial updates to the feature's settings
 * @returns The updated app settings
 */
export function updateFeatureSettings<T = any>(featureId: string, updates: Partial<T>): AppSettings {
  const currentSettings = loadSettings();
  const registration = getFeatureRegistration(featureId);

  if (!registration) {
    console.warn(`Feature "${featureId}" is not registered. Settings will still be saved.`);
  }

  const currentFeatureSettings = currentSettings.features?.[featureId] || {};
  const newFeatureSettings = { ...currentFeatureSettings, ...updates };

  const newSettings: AppSettings = {
    ...currentSettings,
    features: {
      ...currentSettings.features,
      [featureId]: newFeatureSettings,
    },
  };

  saveSettings(newSettings);
  return newSettings;
}

// ============ SETTINGS IPC HANDLERS ============

/**
 * Register all Settings-related IPC handlers
 */
export function registerSettingsIPCHandlers(): void {
  // Handler: Get all settings
  ipcMain.handle('settings:get', () => {
    return loadSettings();
  });

  // Handler: Update settings (partial update supported)
  ipcMain.handle('settings:update', async (event, updates: Partial<AppSettings>) => {
    const oldSettings = loadSettings();
    const newSettings = updateSettingsFields(updates);

    // Notify main process if projectFolder changed
    if (oldSettings.projectFolder !== newSettings.projectFolder) {
      if (onProjectFolderChangedCallback) {
        onProjectFolderChangedCallback(newSettings.projectFolder);
      }
    }

    return newSettings;
  });

  // Handler: Get settings for a specific feature
  ipcMain.handle('settings:getFeature', (event, featureId: string) => {
    return getFeatureSettings(featureId);
  });

  // Handler: Update settings for a specific feature
  ipcMain.handle('settings:updateFeature', (event, featureId: string, updates: Record<string, any>) => {
    return updateFeatureSettings(featureId, updates);
  });

  // Handler: Open folder picker dialog
  ipcMain.handle('settings:openFolderDialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}
