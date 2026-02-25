import { BrowserWindow } from 'electron';
import * as fs from 'fs';

/**
 * Project Folder Watcher Module
 * Watches a folder for subfolder changes and notifies the renderer
 */

let watcher: fs.FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let currentWatchedFolder: string | null = null;

/**
 * Debounce time in milliseconds for watcher events
 */
const DEBOUNCE_MS = 500;

/**
 * Start watching a project folder for changes
 * @param folder - The parent folder to watch
 * @param mainWindow - The main browser window to send IPC events to
 * @param notifyOnStart - Whether to send an initial notification (default: true)
 */
export function startProjectFolderWatcher(folder: string, mainWindow: BrowserWindow | null, notifyOnStart: boolean = true): void {
  // Stop any existing watcher
  stopProjectFolderWatcher();

  if (!folder || !fs.existsSync(folder)) {
    console.warn(`Project folder does not exist: ${folder}`);
    return;
  }

  try {
    currentWatchedFolder = folder;

    // Watch with recursive: false to only watch immediate children
    watcher = fs.watch(folder, { recursive: false }, (_eventType, filename) => {
      if (!filename) return;

      // Only care about directory changes (add/remove/rename)
      // We'll debounce and then send notification
      handleWatcherEvent(mainWindow);
    });

    watcher.on('error', (error) => {
      console.error('Project folder watcher error:', error);
    });

    console.log(`Started watching project folder: ${folder}`);

    // Send initial notification to refresh project list
    if (notifyOnStart) {
      notifyProjectsChanged(mainWindow);
    }
  } catch (error) {
    console.error('Failed to start project folder watcher:', error);
    watcher = null;
    currentWatchedFolder = null;
  }
}

/**
 * Stop watching the project folder
 */
export function stopProjectFolderWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (watcher) {
    watcher.close();
    watcher = null;
    currentWatchedFolder = null;
    console.log('Stopped project folder watcher');
  }
}

/**
 * Update the watcher to watch a new folder
 * @param newFolder - The new folder to watch (or null/empty to stop watching)
 * @param mainWindow - The main browser window to send IPC events to
 */
export function updateWatcherFolder(newFolder: string | null | undefined, mainWindow: BrowserWindow | null): void {
  if (!newFolder) {
    stopProjectFolderWatcher();
    return;
  }

  // If same folder, no need to restart
  if (newFolder === currentWatchedFolder) {
    return;
  }

  startProjectFolderWatcher(newFolder, mainWindow);
}

/**
 * Get the currently watched folder
 */
export function getWatchedFolder(): string | null {
  return currentWatchedFolder;
}

/**
 * Handle watcher events with debouncing
 */
function handleWatcherEvent(mainWindow: BrowserWindow | null): void {
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer
  debounceTimer = setTimeout(() => {
    notifyProjectsChanged(mainWindow);
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

/**
 * Notify the renderer that projects have changed
 */
function notifyProjectsChanged(mainWindow: BrowserWindow | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('projects:changed');
  console.log('Notified renderer of project changes');
}
