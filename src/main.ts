import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from './types/agent-management';
import { registerAgentIPCHandlers, loadAgents, saveAgent } from './main/agent-management';
import { registerProviderIPCHandlers } from './main/provider-management';
import { registerModelConfigIPCHandlers } from './main/model-config-management';
import { registerToolIPCHandlers } from './main/tool-management';
import { registerProjectIPCHandlers } from './main/project-management';
import { registerChatAgentIPCHandlers } from './main/chat-agent-management';
import { registerAppAgentIPCHandlers } from './main/app-agent-management';
import { registerSettingsIPCHandlers } from './main/settings-management';
import { registerNotepadIPCHandlers } from './main/notepad-management';
import { registerAgentTemplateIPCHandlers } from './main/agent-template-management';
import { registerGlobalShortcut, unregisterGlobalShortcut, closeNotepadWindow } from './main/notepad-window';
import { registerQuickAIPCHandlers } from './main/quick-ai-management';
import { registerQuickAIGlobalShortcut, unregisterQuickAIGlobalShortcut, closeQuickAIWindow } from './main/quick-ai-window';
import { registerSnippetIPCHandlers } from './main/snippet-management';
import { registerSnippetShortcut, unregisterSnippetShortcut, closeSnippetWindow } from './main/snippet-window';


let mainWindow: BrowserWindow | null = null;

// Check if we're in development mode
// Dev mode if: NODE_ENV is 'development' OR (app is not packaged AND built renderer files don't exist)
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !fs.existsSync(path.join(__dirname, '../dist-renderer/index.html')));

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the index.html of the app
  if (isDev) {
    // In development, load from the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load from the built file
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Register IPC handlers
  registerIPCHandlers();

  // Register global shortcut for notepad
  registerGlobalShortcut();

  // Register global shortcut for Quick AI
  registerQuickAIGlobalShortcut();

  // Register global shortcut for Snippets
  registerSnippetShortcut();

  app.on('activate', () => {
    // On macOS, re-create the main window when the dock icon is clicked
    if (mainWindow === null) {
      createWindow();
    }
  });
});

// Register all IPC handlers
function registerIPCHandlers(): void {
  // ============ PROJECT IPC HANDLERS ============
  registerProjectIPCHandlers();

  // ============ AGENT IPC HANDLERS ============
  registerAgentIPCHandlers();

  // ============ PROVIDER IPC HANDLERS ============
  registerProviderIPCHandlers();

  // ============ MODEL CONFIG IPC HANDLERS ============
  registerModelConfigIPCHandlers();

  // ============ TOOL IPC HANDLERS ============
  registerToolIPCHandlers();

  // ============ CHAT-AGENT IPC HANDLERS ============
  registerChatAgentIPCHandlers();

  // ============ APP-AGENT IPC HANDLERS ============
  registerAppAgentIPCHandlers();

  // ============ SETTINGS IPC HANDLERS ============
  registerSettingsIPCHandlers();

  // ============ NOTEPAD IPC HANDLERS ============
  registerNotepadIPCHandlers();

  // ============ AGENT TEMPLATE IPC HANDLERS ============
  registerAgentTemplateIPCHandlers();

  // ============ QUICK AI IPC HANDLERS ============
  registerQuickAIPCHandlers();

  // ============ SNIPPET IPC HANDLERS ============
  registerSnippetIPCHandlers();
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up before app quits (called before will-quit)
app.on('before-quit', () => {
  // Close notepad window first
  closeNotepadWindow();
  // Close Quick AI window
  closeQuickAIWindow();
  // Close snippet window
  closeSnippetWindow();
});

// Clean up shortcuts before app quits
app.on('will-quit', () => {
  // Unregister global shortcuts
  unregisterGlobalShortcut();
  unregisterQuickAIGlobalShortcut();
  unregisterSnippetShortcut();
});
