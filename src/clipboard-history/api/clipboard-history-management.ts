import type { ClipboardHistoryManagementAPI, ClipboardHistoryItem } from '../types/clipboard-history-management';

/**
 * Get the Clipboard History Management API
 * Returns a type-safe wrapper around window.electronAPI
 * @returns ClipboardHistoryManagementAPI instance
 */
export function getClipboardHistoryManagementAPI(): ClipboardHistoryManagementAPI {
  // Check if electronAPI is available
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }

  return {
    /**
     * Get all clipboard history items
     */
    async getClipboardHistoryItems(): Promise<ClipboardHistoryItem[]> {
      return window.electronAPI!.getClipboardHistoryItems();
    },

    /**
     * Delete a clipboard history item
     */
    async deleteClipboardHistoryItem(id: string): Promise<void> {
      return window.electronAPI!.deleteClipboardHistoryItem(id);
    },

    /**
     * Clear all clipboard history items
     */
    async clearClipboardHistory(): Promise<void> {
      return window.electronAPI!.clearClipboardHistory();
    },

    /**
     * Get text content of a clipboard history item
     */
    async getTextContent(id: string): Promise<string> {
      return window.electronAPI!.getTextContent(id);
    },

    /**
     * Get image data as base64 data URL
     */
    async getImageData(id: string): Promise<string> {
      return window.electronAPI!.getImageData(id);
    },

    /**
     * Close the clipboard history window
     */
    closeClipboardHistoryWindow(): void {
      window.electronAPI!.closeClipboardHistoryWindow();
    },

    /**
     * Listen for window shown event
     */
    onClipboardHistoryWindowShown(callback: () => void): () => void {
      return window.electronAPI!.onClipboardHistoryWindowShown(callback);
    },
  };
}
