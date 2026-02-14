import { BrowserWindow, globalShortcut, app, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { loadSettings } from './settings-management';

// Global reference to the clipboard history window
let clipboardHistoryWindow: BrowserWindow | null = null;

// Flag to track if we're quitting (to avoid hiding vs closing)
let isQuitting = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !require('fs').existsSync(path.join(__dirname, '../dist-renderer/index.html')));

/**
 * Create the clipboard history window
 * Returns the existing window if already created, otherwise creates a new one
 * @returns The clipboard history BrowserWindow instance
 */
export function createClipboardHistoryWindow(): BrowserWindow {
  // If window already exists, return it
  if (clipboardHistoryWindow) {
    return clipboardHistoryWindow;
  }

  // Create new browser window
  clipboardHistoryWindow = new BrowserWindow({
    height: 600,
    width: 800,
    title: 'Clipboard History',
    show: false, // Don't show automatically - we'll show it manually
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the clipboard history HTML
  if (isDev) {
    // In development, load from the Vite dev server
    clipboardHistoryWindow.loadURL('http://localhost:5173/clipboard-history.html');
  } else {
    // In production, load from the built file
    clipboardHistoryWindow.loadFile(path.join(__dirname, '../dist-renderer/clipboard-history.html'));
  }

  // Send event when window is shown (after being hidden)
  clipboardHistoryWindow.on('show', () => {
    clipboardHistoryWindow?.center();
    if (clipboardHistoryWindow && !clipboardHistoryWindow.isDestroyed()) {
      clipboardHistoryWindow.webContents.send('clipboard-history:windowShown');
    }
  });

  // Hide instead of closing to preserve state (unless we're quitting)
  clipboardHistoryWindow.on('close', (e) => {
    // Only prevent default and hide if we're NOT quitting
    if (!isQuitting) {
      e.preventDefault();
      if (clipboardHistoryWindow) {
        clipboardHistoryWindow.hide();
      }
    }
  });

  // Clean up when window is destroyed
  clipboardHistoryWindow.on('closed', () => {
    clipboardHistoryWindow = null;
  });

  return clipboardHistoryWindow;
}

/**
 * Show the clipboard history window
 * Creates window if it doesn't exist, otherwise shows it
 * Shows error dialog if save location is not configured
 */
export function showClipboardHistoryWindow(): void {
  // Check if save location is configured
  const settings = loadSettings();
  if (!settings.clipboardHistorySaveLocation) {
    dialog.showErrorBox(
      'Clipboard History Save Location Not Configured',
      'Please configure the clipboard history save location in Settings before using clipboard history.'
    );
    return;
  }

  if (clipboardHistoryWindow) {
    clipboardHistoryWindow.show();
  } else {
    createClipboardHistoryWindow();
    if (clipboardHistoryWindow) {
      clipboardHistoryWindow.show();
    }
  }
}

/**
 * Toggle the clipboard history window visibility
 * Shows if hidden/closed, hides if visible
 * Used by the global shortcut
 */
export function toggleClipboardHistoryWindow(): void {
  if (clipboardHistoryWindow && clipboardHistoryWindow.isVisible()) {
    clipboardHistoryWindow.hide();
  } else {
    showClipboardHistoryWindow();
  }
}

/**
 * Register the global shortcut for opening/closing the clipboard history window
 * Shift+Cmd+V on macOS, Shift+Alt+V on Windows/Linux
 */
export function registerClipboardHistoryShortcut(): void {
  // Use CmdOrCtrl+Shift+V which works across all platforms
  // On macOS: Cmd+Shift+V
  // On Windows/Linux: Ctrl+Shift+V
  const ret = globalShortcut.register('CmdOrCtrl+Shift+V', () => {
    toggleClipboardHistoryWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut for clipboard history');
  } else {
    console.log('Global shortcut registered: CmdOrCtrl+Shift+V for Clipboard History');
  }
}

/**
 * Unregister the global shortcut
 * Should be called when app quits
 */
export function unregisterClipboardHistoryShortcut(): void {
  globalShortcut.unregister('CmdOrCtrl+Shift+V');
  console.log('Global shortcut unregistered: CmdOrCtrl+Shift+V');
}

/**
 * Close and destroy the clipboard history window
 * Should be called when app quits to ensure clean shutdown
 */
export function closeClipboardHistoryWindow(): void {
  if (clipboardHistoryWindow) {
    // Set flag to allow the window to actually close (not hide)
    isQuitting = true;
    // Destroy the window forcibly (bypasses the close event prevention)
    clipboardHistoryWindow.destroy();
    // Clear the reference immediately
    clipboardHistoryWindow = null;
  }
}

/**
 * Close the clipboard history window
 * Called from renderer via IPC
 */
ipcMain.on('clipboard-history:closeWindow', () => {
  if (clipboardHistoryWindow && clipboardHistoryWindow.isVisible()) {
    clipboardHistoryWindow.hide();
  }
});
