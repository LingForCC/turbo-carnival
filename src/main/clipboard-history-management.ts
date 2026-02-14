import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { ClipboardHistoryItem } from '../types/clipboard-history-management';
import { loadSettings } from './settings-management';

// ============ CONSTANTS ============

const ERROR_CLIPBOARD_NO_LOCATION = 'CLIPBOARD_NO_LOCATION';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

// ============ STORAGE HELPERS ============

/**
 * Get the clipboard history directory from settings
 * Returns null if no save location is configured
 * @returns The clipboard history directory path, or null if not configured
 */
export function getClipboardHistoryDir(): string | null {
  const settings = loadSettings();
  if (settings.clipboardHistorySaveLocation && fs.existsSync(settings.clipboardHistorySaveLocation)) {
    return settings.clipboardHistorySaveLocation;
  }
  return null;
}

/**
 * Ensure the clipboard history directory exists
 * @param dir - Directory path to ensure exists
 */
export function ensureClipboardHistoryDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate preview text for a clipboard item
 * For text: first 50 characters
 * For images: filename
 * @param type - Item type
 * @param fileName - File name
 * @param content - Text content (for text items)
 * @returns Preview string
 */
export function generatePreview(type: 'text' | 'image', fileName: string, content?: string): string {
  if (type === 'text' && content) {
    // Return first 50 characters, removing newlines for display
    const preview = content.replace(/[\r\n]+/g, ' ').trim();
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  }
  // For images, return the filename
  return fileName;
}

/**
 * Load all clipboard history items from the directory
 * Returns empty array if directory doesn't exist
 * @param dir - Directory to load items from
 * @returns Array of clipboard history items sorted by modifiedAt (newest first)
 */
export function loadClipboardHistoryItems(dir: string): ClipboardHistoryItem[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(dir);

    const items: ClipboardHistoryItem[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      // Skip directories
      if (stats.isDirectory()) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();

      // Determine type based on extension
      let type: 'text' | 'image';
      let preview: string;
      let id: string;

      if (ext === '.txt') {
        type = 'text';
        // Read content for preview
        const content = fs.readFileSync(filePath, 'utf-8');
        preview = generatePreview('text', file, content);
        // ID is the filename without extension
        id = path.basename(file, '.txt');
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        type = 'image';
        preview = generatePreview('image', file);
        // ID is the filename without extension
        id = path.basename(file, ext);
      } else {
        // Skip unsupported file types
        continue;
      }

      items.push({
        id,
        type,
        fileName: file,
        preview,
        modifiedAt: stats.mtimeMs,
      });
    }

    // Sort by modifiedAt (newest first)
    items.sort((a, b) => b.modifiedAt - a.modifiedAt);

    return items;
  } catch (error) {
    console.error('Failed to load clipboard history items:', error);
    return [];
  }
}

/**
 * Delete a clipboard history item
 * @param dir - Directory containing the item
 * @param id - The ID of the item to delete
 */
export function deleteClipboardHistoryItem(dir: string, id: string): void {
  // Find the file with this ID (could be .txt or an image extension)
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const fileId = path.basename(file, ext);

    if (fileId === id) {
      const filePath = path.join(dir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }
  }
}

/**
 * Clear all clipboard history items
 * @param dir - Directory to clear
 */
export function clearClipboardHistory(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (!stats.isDirectory()) {
      const ext = path.extname(file).toLowerCase();
      // Only delete supported file types
      if (ext === '.txt' || IMAGE_EXTENSIONS.includes(ext)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

/**
 * Get text content of a clipboard history item
 * @param dir - Directory containing the item
 * @param id - The ID of the item
 * @returns Text content
 */
export function getTextContent(dir: string, id: string): string {
  const filePath = path.join(dir, `${id}.txt`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

/**
 * Get image data as base64 data URL
 * @param dir - Directory containing the item
 * @param id - The ID of the item
 * @returns Base64 data URL
 */
export function getImageDataUrl(dir: string, id: string): string {
  // Find the image file with this ID
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const fileId = path.basename(file, ext);

    if (fileId === id && IMAGE_EXTENSIONS.includes(ext)) {
      const filePath = path.join(dir, file);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        // Determine MIME type based on extension
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') {
          mimeType = 'image/jpeg';
        } else if (ext === '.gif') {
          mimeType = 'image/gif';
        } else if (ext === '.bmp') {
          mimeType = 'image/bmp';
        } else if (ext === '.webp') {
          mimeType = 'image/webp';
        }
        return `data:${mimeType};base64,${base64}`;
      }
    }
  }

  return '';
}

// ============ IPC HANDLERS ============

/**
 * Register all Clipboard History-related IPC handlers
 */
export function registerClipboardHistoryIPCHandlers(): void {
  // Handler: Get list of clipboard history items
  ipcMain.handle('clipboard-history:getItems', async () => {
    const dir = getClipboardHistoryDir();

    if (!dir) {
      throw new Error(ERROR_CLIPBOARD_NO_LOCATION);
    }

    return loadClipboardHistoryItems(dir);
  });

  // Handler: Delete a clipboard history item
  ipcMain.handle('clipboard-history:deleteItem', async (_event, id: string) => {
    const dir = getClipboardHistoryDir();

    if (!dir) {
      throw new Error(ERROR_CLIPBOARD_NO_LOCATION);
    }

    deleteClipboardHistoryItem(dir, id);
  });

  // Handler: Clear all clipboard history items
  ipcMain.handle('clipboard-history:clearAll', async () => {
    const dir = getClipboardHistoryDir();

    if (!dir) {
      throw new Error(ERROR_CLIPBOARD_NO_LOCATION);
    }

    clearClipboardHistory(dir);
  });

  // Handler: Get text content
  ipcMain.handle('clipboard-history:getTextContent', async (_event, id: string) => {
    const dir = getClipboardHistoryDir();

    if (!dir) {
      throw new Error(ERROR_CLIPBOARD_NO_LOCATION);
    }

    return getTextContent(dir, id);
  });

  // Handler: Get image data
  ipcMain.handle('clipboard-history:getImageData', async (_event, id: string) => {
    const dir = getClipboardHistoryDir();

    if (!dir) {
      throw new Error(ERROR_CLIPBOARD_NO_LOCATION);
    }

    return getImageDataUrl(dir, id);
  });

  // Handler: Close clipboard history window (called from renderer)
  ipcMain.on('clipboard-history:closeWindow', () => {
    // This will be handled by clipboard-history-window module
  });
}
