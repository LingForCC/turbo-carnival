import { ipcMain, app, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { SnippetFile } from '../types';
import { loadSettings } from '../../settings/main/settings-management';

// ============ CONSTANTS ============

const ERROR_SNIPPET_NO_LOCATION = 'SNIPPET_NO_LOCATION';
const INVALID_CHARS = /[<>:"/\\|?*]/g;
const FILE_EXTENSION = '.txt';

// ============ STORAGE HELPERS ============

/**
 * Get the snippet directory from settings
 * Returns null if no save location is configured (user's preference: no default save)
 * @param saveLocation - Optional save location from settings
 * @returns The snippet directory path, or null if not configured
 */
export function getSnippetDir(saveLocation?: string): string | null {
  if (saveLocation && fs.existsSync(saveLocation)) {
    return saveLocation;
  }
  // Return null instead of default - user explicitly wants no save if not configured
  return null;
}

/**
 * Ensure the snippet directory exists
 * @param dir - Directory path to ensure exists
 */
export function ensureSnippetDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sanitize user-provided name for use as filename
 * Removes invalid filesystem characters
 * @param name - User-provided name
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  return name.replace(INVALID_CHARS, '').trim();
}

/**
 * Generate a unique filename from user-provided name
 * Appends counter if name conflicts with existing file
 * @param dir - Directory to check for conflicts
 * @param name - Sanitized base name
 * @returns Unique filename with extension
 */
export function generateUniqueFileName(dir: string, name: string): string {
  let baseName = sanitizeName(name);
  if (!baseName) {
    baseName = 'Untitled';
  }

  let fileName = baseName + FILE_EXTENSION;
  let counter = 2;

  // Check if file exists and append counter if needed
  while (fs.existsSync(path.join(dir, fileName))) {
    fileName = `${baseName} (${counter})${FILE_EXTENSION}`;
    counter++;
  }

  return fileName;
}

/**
 * Load all snippet files from the directory
 * Returns empty array if directory doesn't exist
 * @param dir - Directory to load files from
 * @returns Array of snippet files sorted by name alphabetically
 */
export function loadSnippetFiles(dir: string): SnippetFile[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(dir)
      .filter((f) => f.endsWith(FILE_EXTENSION))
      .map((f) => {
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = f.slice(0, -FILE_EXTENSION.length);
        return {
          fileName: f,
          name,
          content,
          createdAt: stats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return files;
  } catch (error) {
    console.error('Failed to load snippet files:', error);
    return [];
  }
}

/**
 * Create a new snippet file with user-provided name
 * @param dir - Directory to create the file in
 * @param name - User-provided name for the snippet
 * @param content - Initial content
 * @returns The created snippet file metadata
 */
export function createSnippetFile(dir: string, name: string, content: string): SnippetFile {
  ensureSnippetDir(dir);

  const fileName = generateUniqueFileName(dir, name);
  const filePath = path.join(dir, fileName);

  // Create file with content
  fs.writeFileSync(filePath, content, 'utf-8');

  const stats = fs.statSync(filePath);
  const sanitizedName = fileName.slice(0, -FILE_EXTENSION.length);

  return {
    fileName,
    name: sanitizedName,
    content,
    createdAt: stats.birthtimeMs,
    modifiedAt: stats.mtimeMs,
  };
}

/**
 * Read snippet file content
 * @param dir - Directory containing the snippet
 * @param fileName - Full filename with extension
 * @returns File content as string, empty string if file doesn't exist
 */
export function readSnippetContent(dir: string, fileName: string): string {
  const filePath = path.join(dir, fileName);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read snippet file:', error);
      return '';
    }
  }
  return '';
}

/**
 * Save snippet content to file
 * @param dir - Directory containing the snippet
 * @param fileName - Full filename with extension
 * @param content - Content to save
 * @throws Error if save fails
 */
export function saveSnippetContent(dir: string, fileName: string, content: string): void {
  const filePath = path.join(dir, fileName);
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error('Failed to save snippet content:', error);
    throw error;
  }
}

/**
 * Rename snippet file
 * @param dir - Directory containing the snippet
 * @param oldName - Current filename with extension
 * @param newName - New name for the snippet (without extension)
 * @throws Error if rename fails
 */
export function renameSnippetFile(dir: string, oldName: string, newName: string): void {
  const oldPath = path.join(dir, oldName);
  const sanitizedNewName = sanitizeName(newName);

  if (!sanitizedNewName) {
    throw new Error('Invalid name');
  }

  const newFileName = sanitizedNewName + FILE_EXTENSION;
  const newPath = path.join(dir, newFileName);

  // Check if target filename already exists (and it's not the same as source)
  if (fs.existsSync(newPath) && newPath !== oldPath) {
    // Target name already exists, generate unique name
    const uniqueFileName = generateUniqueFileName(dir, sanitizedNewName);
    const uniquePath = path.join(dir, uniqueFileName);

    // Read current content and create new file
    const content = readSnippetContent(dir, oldName);
    fs.writeFileSync(uniquePath, content, 'utf-8');

    // Delete old file
    deleteSnippetFile(dir, oldName);
  } else {
    // Target name doesn't exist, just rename directly
    fs.renameSync(oldPath, newPath);
  }
}

/**
 * Delete snippet file
 * @param dir - Directory containing the snippet
 * @param fileName - Full filename with extension
 */
export function deleteSnippetFile(dir: string, fileName: string): void {
  const filePath = path.join(dir, fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Failed to delete snippet file:', error);
      throw error;
    }
  }
}

// ============ IPC HANDLERS ============

/**
 * Register all Snippet-related IPC handlers
 */
export function registerSnippetIPCHandlers(): void {
  // Handler: Get list of snippet files
  ipcMain.handle('snippets:getFiles', async () => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      // Throw error that renderer should handle
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    return loadSnippetFiles(dir);
  });

  // Handler: Read snippet file content
  ipcMain.handle('snippets:readFile', async (_event, fileName: string) => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    return readSnippetContent(dir, fileName);
  });

  // Handler: Create new snippet file
  ipcMain.handle('snippets:createFile', async (_event, name: string, content: string) => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      // Throw error that renderer should handle
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    return createSnippetFile(dir, name, content);
  });

  // Handler: Save snippet content
  ipcMain.handle('snippets:saveContent', async (_event, fileName: string, content: string) => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    saveSnippetContent(dir, fileName, content);
  });

  // Handler: Rename snippet file
  ipcMain.handle('snippets:renameFile', async (_event, oldName: string, newName: string) => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    renameSnippetFile(dir, oldName, newName);

    // Return updated file list
    return loadSnippetFiles(dir);
  });

  // Handler: Delete snippet file
  ipcMain.handle('snippets:deleteFile', async (_event, fileName: string) => {
    const settings = loadSettings();
    const dir = getSnippetDir(settings.snippetSaveLocation);

    if (!dir) {
      throw new Error(ERROR_SNIPPET_NO_LOCATION);
    }

    deleteSnippetFile(dir, fileName);

    // Return updated file list
    return loadSnippetFiles(dir);
  });

  // Handler: Close snippet window (called from renderer)
  ipcMain.on('snippets:closeWindow', () => {
    // This will be handled by snippet-window module
    // We just emit the event for it to handle
  });
}
