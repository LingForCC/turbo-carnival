import { BrowserWindow, globalShortcut, app } from 'electron';
import * as path from 'path';

// Global reference to the notepad window
let notepadWindow: BrowserWindow | null = null;

// Flag to track if we're quitting (to avoid hiding vs closing)
let isQuitting = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !require('fs').existsSync(path.join(__dirname, '../dist-renderer/index.html')));

/**
 * Create the notepad window
 * Returns the existing window if already created, otherwise creates a new one
 * @returns The notepad BrowserWindow instance
 */
export function createNotepadWindow(): BrowserWindow {
  // If window already exists, return it
  if (notepadWindow) {
    return notepadWindow;
  }

  // Create new browser window
  notepadWindow = new BrowserWindow({
    height: 600,
    width: 800,
    title: 'Quick Notepad',
    show: false, // Don't show automatically - we'll show it manually
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the notepad HTML
  if (isDev) {
    // In development, load from the Vite dev server
    notepadWindow.loadURL('http://localhost:5173/notepad.html');
  } else {
    // In production, load from the built file
    notepadWindow.loadFile(path.join(__dirname, '../dist-renderer/notepad.html'));
  }

  // Reload files when window is shown (after being hidden)
  notepadWindow.on('show', () => {
    notepadWindow?.webContents.send('notepad:windowShown');
  });

  // Hide instead of closing to preserve state (unless we're quitting)
  notepadWindow.on('close', (e) => {
    // Only prevent default and hide if we're NOT quitting
    if (!isQuitting) {
      e.preventDefault();
      if (notepadWindow) {
        notepadWindow.hide();
      }
    }
  });

  // Clean up when window is destroyed
  notepadWindow.on('closed', () => {
    notepadWindow = null;
  });

  return notepadWindow;
}

/**
 * Show the notepad window
 * Creates window if it doesn't exist, otherwise shows and brings it to front
 */
export function showNotepadWindow(): void {
  if (notepadWindow) {
    notepadWindow.show();
    notepadWindow.focus();
  } else {
    createNotepadWindow();
    if (notepadWindow) {
      notepadWindow.show();
      notepadWindow.focus();
    }
  }
}

/**
 * Toggle the notepad window visibility
 * Shows if hidden/closed, hides if visible
 * Used by the global shortcut
 */
export function toggleNotepadWindow(): void {
  if (notepadWindow && notepadWindow.isVisible()) {
    notepadWindow.hide();
  } else {
    showNotepadWindow();
  }
}

/**
 * Register the global shortcut for bringing the notepad to front
 * Option+A on macOS, Alt+A on Windows/Linux
 */
export function registerGlobalShortcut(): void {
  // Use Alt+A which works across all platforms
  // On macOS: Alt = Option key
  // On Windows/Linux: Alt = Alt key
  const ret = globalShortcut.register('Alt+A', () => {
    showNotepadWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut for notepad');
  } else {
    console.log('Global shortcut registered: Alt+A (Option+A on macOS) for Quick Notepad');
  }
}

/**
 * Unregister the global shortcut
 * Should be called when app quits
 */
export function unregisterGlobalShortcut(): void {
  globalShortcut.unregister('Alt+A');
  console.log('Global shortcut unregistered: Alt+A');
}

/**
 * Close and destroy the notepad window
 * Should be called when app quits to ensure clean shutdown
 */
export function closeNotepadWindow(): void {
  if (notepadWindow) {
    // Set flag to allow the window to actually close (not hide)
    isQuitting = true;
    // Destroy the window forcibly (bypasses the close event prevention)
    notepadWindow.destroy();
    // Clear the reference immediately
    notepadWindow = null;
  }
}
