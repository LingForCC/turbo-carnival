import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { NotepadFile, NotepadSettings } from '../types';
import { getFeatureSettings } from '../../settings/main/settings-management';

// ============ CONSTANTS ============

const ERROR_NOTEPAD_NO_LOCATION = 'NOTEPAD_NO_LOCATION';

// ============ IN-MEMORY STORAGE ============

/**
 * In-memory storage for notepad content
 * Stores unsaved content keyed by file path
 * This ensures content persistence even if window is closed before auto-save triggers
 */
const inMemoryContent = new Map<string, string>();

// ============ STORAGE HELPERS ============

/**
 * Get the notepad directory from settings
 * Returns null if no save location is configured (user's preference: no default save)
 * @param saveLocation - Optional save location from settings
 * @returns The notepad directory path, or null if not configured
 */
export function getNotepadDir(saveLocation?: string): string | null {
  if (saveLocation && fs.existsSync(saveLocation)) {
    return saveLocation;
  }
  // Return null instead of default - user explicitly wants no save if not configured
  return null;
}

/**
 * Ensure the notepad directory exists
 * @param dir - Directory path to ensure exists
 */
export function ensureNotepadDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load all notepad files from the directory
 * Returns empty array if directory doesn't exist
 * @param dir - Directory to load files from
 * @returns Array of notepad files sorted by modification date (newest first)
 */
export function loadNotepadFiles(dir: string): NotepadFile[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(dir)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => {
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          modifiedAt: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt);

    return files;
  } catch (error) {
    console.error('Failed to load notepad files:', error);
    return [];
  }
}

/**
 * Create a new notepad file with timestamp-based name
 * @param dir - Directory to create the file in
 * @returns The created notepad file metadata
 */
export function createNotepadFile(dir: string): NotepadFile {
  ensureNotepadDir(dir);

  // Create timestamp-based filename: YYYY-MM-DD-HHMMSS.txt
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const fileName = `${year}-${month}-${day}-${hours}${minutes}${seconds}.txt`;
  const filePath = path.join(dir, fileName);

  // Create empty file
  fs.writeFileSync(filePath, '', 'utf-8');

  return {
    name: fileName,
    path: filePath,
    modifiedAt: Date.now(),
  };
}

/**
 * Read notepad file content
 * Checks in-memory storage first for unsaved content, then falls back to disk
 * @param filePath - Full path to the notepad file
 * @returns File content as string, empty string if file doesn't exist
 */
export function readNotepadContent(filePath: string): string {
  // Check in-memory storage first (for unsaved content)
  const inMemory = inMemoryContent.get(filePath);
  if (inMemory !== undefined) {
    return inMemory;
  }

  // Fall back to disk
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read notepad file:', error);
      return '';
    }
  }
  return '';
}

/**
 * Update in-memory content for a file
 * Called when user types to ensure content is persisted even before auto-save
 * @param filePath - Full path to the notepad file
 * @param content - Current content in the editor
 */
export function updateInMemoryContent(filePath: string, content: string): void {
  inMemoryContent.set(filePath, content);
}

/**
 * Clear in-memory content for a file (after successful save or file deletion)
 * @param filePath - Full path to the notepad file
 */
export function clearInMemoryContent(filePath: string): void {
  inMemoryContent.delete(filePath);
}

/**
 * Save notepad content to file
 * Also updates in-memory content and clears it after successful save
 * @param filePath - Full path to the notepad file
 * @param content - Content to save
 * @throws Error if save fails
 */
export function saveNotepadContent(filePath: string, content: string): void {
  try {
    // Update in-memory content first
    inMemoryContent.set(filePath, content);
    // Save to disk
    fs.writeFileSync(filePath, content, 'utf-8');
    // Clear in-memory content after successful save
    inMemoryContent.delete(filePath);
  } catch (error) {
    console.error('Failed to save notepad content:', error);
    throw error;
  }
}

/**
 * Delete notepad file
 * Also clears any in-memory content for the file
 * @param filePath - Full path to the notepad file
 */
export function deleteNotepadFile(filePath: string): void {
  // Clear in-memory content first
  inMemoryContent.delete(filePath);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Failed to delete notepad file:', error);
      throw error;
    }
  }
}

// ============ IPC HANDLERS ============

/**
 * Register all Notepad-related IPC handlers
 */
export function registerNotepadIPCHandlers(): void {
  // Handler: Get list of notepad files
  ipcMain.handle('notepad:getFiles', async () => {
    const settings = getFeatureSettings<NotepadSettings>('notepad');
    const dir = getNotepadDir(settings.saveLocation);

    if (!dir) {
      // Throw error that renderer should handle
      throw new Error(ERROR_NOTEPAD_NO_LOCATION);
    }

    return loadNotepadFiles(dir);
  });

  // Handler: Read notepad file content
  ipcMain.handle('notepad:readFile', async (_event, filePath: string) => {
    return readNotepadContent(filePath);
  });

  // Handler: Create new notepad file
  ipcMain.handle('notepad:createFile', async () => {
    const settings = getFeatureSettings<NotepadSettings>('notepad');
    const dir = getNotepadDir(settings.saveLocation);

    if (!dir) {
      // Throw error that renderer should handle
      throw new Error(ERROR_NOTEPAD_NO_LOCATION);
    }

    return createNotepadFile(dir);
  });

  // Handler: Save notepad content
  ipcMain.handle('notepad:saveContent', async (_event, filePath: string, content: string) => {
    saveNotepadContent(filePath, content);
  });

  // Handler: Delete notepad file
  ipcMain.handle('notepad:deleteFile', async (_event, filePath: string) => {
    deleteNotepadFile(filePath);
  });

  // Handler: Update in-memory content (called on every keystroke)
  ipcMain.handle('notepad:updateInMemoryContent', async (_event, filePath: string, content: string) => {
    updateInMemoryContent(filePath, content);
  });
}
