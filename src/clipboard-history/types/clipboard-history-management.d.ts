/**
 * Clipboard History Management Type Definitions
 * Contains all types and interfaces related to clipboard history functionality
 */

/**
 * Clipboard history item
 */
export interface ClipboardHistoryItem {
  id: string;
  type: 'text' | 'image';
  fileName: string;
  preview: string;
  modifiedAt: number;
}

/**
 * Clipboard History Management API interface
 * Defines the contract for clipboard history management operations
 * Used by renderer components to interact with clipboard history functionality
 */
export interface ClipboardHistoryManagementAPI {
  /**
   * Get all clipboard history items
   * @returns Promise resolving to array of clipboard history items
   */
  getClipboardHistoryItems(): Promise<ClipboardHistoryItem[]>;

  /**
   * Delete a clipboard history item
   * @param id - The ID of the item to delete
   * @returns Promise resolving when deletion is complete
   */
  deleteClipboardHistoryItem(id: string): Promise<void>;

  /**
   * Clear all clipboard history items
   * @returns Promise resolving when all items are cleared
   */
  clearClipboardHistory(): Promise<void>;

  /**
   * Get text content of a clipboard history item
   * @param id - The ID of the item
   * @returns Promise resolving to the text content
   */
  getTextContent(id: string): Promise<string>;

  /**
   * Get image data as base64 data URL
   * @param id - The ID of the item
   * @returns Promise resolving to base64 data URL
   */
  getImageData(id: string): Promise<string>;

  /**
   * Close the clipboard history window
   */
  closeClipboardHistoryWindow(): void;

  /**
   * Listen for window shown event
   * @param callback - Callback to run when window is shown
   * @returns Cleanup function to remove listener
   */
  onClipboardHistoryWindowShown(callback: () => void): () => void;
}
