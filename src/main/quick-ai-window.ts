import { BrowserWindow, globalShortcut, app } from 'electron';
import * as path from 'path';

// Global reference to the Quick AI window
let quickAIWindow: BrowserWindow | null = null;

// Flag to track if we're quitting (to avoid hiding vs closing)
let isQuitting = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !require('fs').existsSync(path.join(__dirname, '../dist-renderer/index.html')));

/**
 * Create the Quick AI window
 * Returns the existing window if already created, otherwise creates a new one
 * @returns The Quick AI BrowserWindow instance
 */
export function createQuickAIWindow(): BrowserWindow {
  // If window already exists, return it
  if (quickAIWindow) {
    return quickAIWindow;
  }

  // Create new browser window
  quickAIWindow = new BrowserWindow({
    height: 600,
    width: 800,
    title: 'Quick AI',
    show: false, // Don't show automatically - we'll show it manually
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the Quick AI HTML
  if (isDev) {
    // In development, load from the Vite dev server
    quickAIWindow.loadURL('http://localhost:5173/quick-ai.html');
  } else {
    // In production, load from the built file
    quickAIWindow.loadFile(path.join(__dirname, '../dist-renderer/quick-ai.html'));
  }

  // Send event when window is shown (after being hidden)
  quickAIWindow.on('show', () => {
    if (quickAIWindow && !quickAIWindow.isDestroyed()) {
      quickAIWindow.webContents.send('quick-ai:windowShown');
    }
  });

  // Hide instead of closing to preserve state (unless we're quitting)
  quickAIWindow.on('close', (e) => {
    // Only prevent default and hide if we're NOT quitting
    if (!isQuitting) {
      e.preventDefault();
      if (quickAIWindow) {
        quickAIWindow.hide();
      }
    }
  });

  // Clean up when window is destroyed
  quickAIWindow.on('closed', () => {
    quickAIWindow = null;
  });

  return quickAIWindow;
}

/**
 * Show the Quick AI window
 * Creates window if it doesn't exist, otherwise shows it
 */
export function showQuickAIWindow(): void {
  if (quickAIWindow) {
    quickAIWindow.show();
  } else {
    createQuickAIWindow();
    if (quickAIWindow) {
      quickAIWindow.show();
    }
  }
}

/**
 * Toggle the Quick AI window visibility
 * Shows if hidden/closed, hides if visible
 * Used by the global shortcut
 */
export function toggleQuickAIWindow(): void {
  if (quickAIWindow && quickAIWindow.isVisible()) {
    quickAIWindow.hide();
  } else {
    showQuickAIWindow();
  }
}

/**
 * Register the global shortcut for opening/closing the Quick AI window
 * Option+Q on macOS, Alt+Q on Windows/Linux
 */
export function registerQuickAIGlobalShortcut(): void {
  // Use Alt+Q which works across all platforms
  // On macOS: Alt = Option key
  // On Windows/Linux: Alt = Alt key
  const ret = globalShortcut.register('Alt+Q', () => {
    toggleQuickAIWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut for Quick AI');
  } else {
    console.log('Global shortcut registered: Alt+Q (Option+Q on macOS) for Quick AI');
  }
}

/**
 * Unregister the global shortcut
 * Should be called when app quits
 */
export function unregisterQuickAIGlobalShortcut(): void {
  globalShortcut.unregister('Alt+Q');
  console.log('Global shortcut unregistered: Alt+Q');
}

/**
 * Close and destroy the Quick AI window
 * Should be called when app quits to ensure clean shutdown
 */
export function closeQuickAIWindow(): void {
  if (quickAIWindow) {
    // Set flag to allow the window to actually close (not hide)
    isQuitting = true;
    // Destroy the window forcibly (bypasses the close event prevention)
    quickAIWindow.destroy();
    // Clear the reference immediately
    quickAIWindow = null;
  }
}
