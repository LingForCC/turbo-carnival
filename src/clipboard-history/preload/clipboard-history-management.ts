import { ipcRenderer } from 'electron';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const clipboardHistoryManagement = {
  // Get list of clipboard history items
  getClipboardHistoryItems: () => ipcRenderer.invoke('clipboard-history:getItems'),

  // Delete a clipboard history item
  deleteClipboardHistoryItem: (id: string) => ipcRenderer.invoke('clipboard-history:deleteItem', id),

  // Clear all clipboard history items
  clearClipboardHistory: () => ipcRenderer.invoke('clipboard-history:clearAll'),

  // Get text content of a clipboard history item
  getTextContent: (id: string) => ipcRenderer.invoke('clipboard-history:getTextContent', id),

  // Get image data as base64 data URL
  getImageData: (id: string) => ipcRenderer.invoke('clipboard-history:getImageData', id),

  // Close clipboard history window
  closeClipboardHistoryWindow: () => ipcRenderer.send('clipboard-history:closeWindow'),

  // Listen for window shown event
  onClipboardHistoryWindowShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('clipboard-history:windowShown', listener);
    // Return cleanup function
    return () => ipcRenderer.removeListener('clipboard-history:windowShown', listener);
  },
};
