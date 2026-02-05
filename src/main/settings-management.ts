import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { AppSettings } from '../types/settings-management';

// ============ SETTINGS STORAGE HELPERS ============

/**
 * Get the file path for settings storage
 */
export function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
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
      return data.settings || { theme: 'light' };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return { theme: 'light' };
    }
  }
  // Return default settings
  return { theme: 'light' };
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
  ipcMain.handle('settings:update', async (_event, updates: Partial<AppSettings>) => {
    const newSettings = updateSettingsFields(updates);
    return newSettings;
  });
}
