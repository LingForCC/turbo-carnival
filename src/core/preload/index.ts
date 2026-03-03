/**
 * Core Preload Module
 * Exposes core functionality to the renderer process
 */

import { ipcRenderer } from 'electron';

/**
 * External links management API for preload
 */
export const coreManagement = {
  /**
   * Open a URL in the system's default browser
   */
  openExternalURL: (url: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('external:openURL', url);
  },
};
