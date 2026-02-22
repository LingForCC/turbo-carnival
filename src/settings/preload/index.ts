import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const settingsManagement = {
  // Get all settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Update settings (supports partial updates)
  updateSettings: (updates: Record<string, any>) =>
    ipcRenderer.invoke('settings:update', updates),

  // Get settings for a specific feature
  getFeatureSettings: (featureId: string) =>
    ipcRenderer.invoke('settings:getFeature', featureId),

  // Update settings for a specific feature
  updateFeatureSettings: (featureId: string, updates: Record<string, any>) =>
    ipcRenderer.invoke('settings:updateFeature', featureId, updates),

  // Open folder picker dialog
  openFolderDialog: () => ipcRenderer.invoke('settings:openFolderDialog'),
};
