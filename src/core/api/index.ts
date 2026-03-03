/**
 * Core API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Open a URL in the system's default browser
 * @param url - The URL to open (must be HTTP or HTTPS)
 * @returns Promise resolving to success status
 */
export async function openExternalURL(url: string): Promise<{ success: boolean; error?: string }> {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI.openExternalURL(url);
}
