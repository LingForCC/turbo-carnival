import { ipcMain, shell } from 'electron';

/**
 * Register IPC handlers for opening external URLs
 */
export function registerExternalLinksIPCHandlers(): void {
  ipcMain.handle('external:openURL', async (_event, url: string) => {
    try {
      // Validate that it's actually a URL
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        console.warn('Blocked non-HTTP(S) URL:', url);
        return { success: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { success: false, error: String(error) };
    }
  });
}
