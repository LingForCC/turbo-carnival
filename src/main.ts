import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from './global.d.ts';
import { registerAgentIPCHandlers, loadAgents, saveAgent } from './main/agent-management';
import { registerAppIPCHandlers } from './main/app-management';
import { registerApiKeyIPCHandlers, getAPIKeyByName } from './main/apiKey-management';
import { registerProviderIPCHandlers } from './main/provider-management';
import { registerModelConfigIPCHandlers } from './main/model-config-management';
import { migrateAPIKeysToProviders } from './main/migration';
import { migrateAgentConfigsToModelConfigs } from './main/migration-model-config';
import { registerOpenAIClientIPCHandlers } from './main/openai-client';
import { registerToolIPCHandlers } from './main/tool-management';
import { registerProjectIPCHandlers } from './main/project-management';
import { registerChatAgentIPCHandlers } from './main/chat-agent-management';
import { registerAppAgentIPCHandlers } from './main/app-agent-management';


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
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
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
  // Run API key to provider migration on startup
  const migrationResult = migrateAPIKeysToProviders();

  if (migrationResult.success && migrationResult.migrated > 0) {
    console.log(`Migrated ${migrationResult.migrated} API keys to providers`);
  } else if (!migrationResult.success) {
    console.error('Migration failed:', migrationResult.errors);
  }

  // Run agent config to ModelConfig migration on startup
  const modelConfigMigrationResult = migrateAgentConfigsToModelConfigs();

  if (modelConfigMigrationResult.success && modelConfigMigrationResult.migrated > 0) {
    console.log(`Migrated ${modelConfigMigrationResult.migrated} agents to use ModelConfig`);
  } else if (!modelConfigMigrationResult.success) {
    console.error('ModelConfig migration failed:', modelConfigMigrationResult.errors);
  }

  createWindow();

  // Register IPC handlers
  registerIPCHandlers();

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
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

  // ============ API KEY IPC HANDLERS (DEPRECATED) ============
  // Kept for migration period
  registerApiKeyIPCHandlers();

  // ============ TOOL IPC HANDLERS ============
  registerToolIPCHandlers();

  // ============ APP IPC HANDLERS ============
  registerAppIPCHandlers();

  // ============ CHAT-AGENT IPC HANDLERS ============
  registerChatAgentIPCHandlers();

  // ============ APP-AGENT IPC HANDLERS ============
  registerAppAgentIPCHandlers();

  // ============ OPENAI CLIENT IPC HANDLERS ============
  // Now a no-op - handlers are registered in agent management modules
  registerOpenAIClientIPCHandlers();
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
