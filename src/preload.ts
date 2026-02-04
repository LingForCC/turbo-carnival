import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings } from './global.d.ts';
import { projectManagement } from './preload/project-management';
import { agentManagement } from './preload/agent-management';
import { providerManagement } from './preload/provider-management';
import { toolManagement } from './preload/tool-management';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  ...projectManagement,

  ...agentManagement,

  ...providerManagement,

  ...toolManagement,

  // ============ SETTINGS METHODS ============

  // Get all settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Update settings (supports partial updates)
  updateSettings: (updates: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:update', updates),
});
