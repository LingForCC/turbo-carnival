import { BrowserWindow, globalShortcut, app, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { loadSettings } from './settings-management';

// Global reference to the snippet window
let snippetWindow: BrowserWindow | null = null;

// Flag to track if we're quitting (to avoid hiding vs closing)
let isQuitting = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !require('fs').existsSync(path.join(__dirname, '../dist-renderer/index.html')));

/**
 * Create the snippet window
 * Returns the existing window if already created, otherwise creates a new one
 * @returns The snippet BrowserWindow instance
 */
export function createSnippetWindow(): BrowserWindow {
  // If window already exists, return it
  if (snippetWindow) {
    return snippetWindow;
  }

  // Create new browser window
  snippetWindow = new BrowserWindow({
    height: 500,
    width: 700,
    title: 'Snippets',
    show: false, // Don't show automatically - we'll show it manually
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the snippet HTML
  if (isDev) {
    // In development, load from the Vite dev server
    snippetWindow.loadURL('http://localhost:5173/snippet.html');
  } else {
    // In production, load from the built file
    snippetWindow.loadFile(path.join(__dirname, '../dist-renderer/snippet.html'));
  }

  // Center window when shown
  snippetWindow.on('show', () => {
    snippetWindow?.center();
  });

  // Hide instead of closing to preserve state (unless we're quitting)
  snippetWindow.on('close', (e) => {
    // Only prevent default and hide if we're NOT quitting
    if (!isQuitting) {
      e.preventDefault();
      if (snippetWindow) {
        snippetWindow.hide();
      }
    }
  });

  // Clean up when window is destroyed
  snippetWindow.on('closed', () => {
    snippetWindow = null;
  });

  return snippetWindow;
}

/**
 * Show the snippet window
 * Creates window if it doesn't exist, otherwise shows it
 * Shows error dialog if save location is not configured
 */
export function showSnippetWindow(): void {
  // Check if save location is configured
  const settings = loadSettings();
  if (!settings.snippetSaveLocation) {
    dialog.showErrorBox(
      'Snippet Save Location Not Configured',
      'Please configure the snippet save location in Settings before using snippets.'
    );
    return;
  }

  if (snippetWindow) {
    snippetWindow.show();
  } else {
    createSnippetWindow();
    if (snippetWindow) {
      snippetWindow.show();
    }
  }
}

/**
 * Toggle the snippet window visibility
 * Shows if hidden/closed, hides if visible
 * Used by the global shortcut
 */
export function toggleSnippetWindow(): void {
  if (snippetWindow && snippetWindow.isVisible()) {
    snippetWindow.hide();
  } else {
    showSnippetWindow();
  }
}

/**
 * Register the global shortcut for opening/closing the snippet window
 * Option+S on macOS, Alt+S on Windows/Linux
 */
export function registerSnippetShortcut(): void {
  // Use Alt+S which works across all platforms
  // On macOS: Alt = Option key
  // On Windows/Linux: Alt = Alt key
  const ret = globalShortcut.register('Alt+S', () => {
    toggleSnippetWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut for snippets');
  } else {
    console.log('Global shortcut registered: Alt+S (Option+S on macOS) for Snippets');
  }
}

/**
 * Unregister the global shortcut
 * Should be called when app quits
 */
export function unregisterSnippetShortcut(): void {
  globalShortcut.unregister('Alt+S');
  console.log('Global shortcut unregistered: Alt+S');
}

/**
 * Close and destroy the snippet window
 * Should be called when app quits to ensure clean shutdown
 */
export function closeSnippetWindow(): void {
  if (snippetWindow) {
    // Set flag to allow the window to actually close (not hide)
    isQuitting = true;
    // Destroy the window forcibly (bypasses the close event prevention)
    snippetWindow.destroy();
    // Clear the reference immediately
    snippetWindow = null;
  }
}

/**
 * Close the snippet window
 * Called from renderer via IPC
 */
ipcMain.on('snippets:closeWindow', () => {
  if (snippetWindow && snippetWindow.isVisible()) {
    snippetWindow.hide();
  }
});
