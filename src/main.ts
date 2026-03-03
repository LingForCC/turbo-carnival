import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerAgentIPCHandlers } from './agent/main/agent-management';
import { registerToolIPCHandlers, initializeMCPServers } from './tools/main/tool-management';
import { registerProjectIPCHandlers } from './project/main/project-management';
import { registerChatAgentIPCHandlers } from './agent/main/chat-agent-management';
import { registerAppAgentIPCHandlers } from './agent/main/app-agent-management';
import { registerSettingsIPCHandlers } from './settings/main/settings-management';
import { registerNotepadIPCHandlers } from './notepad/main/notepad-management';
import { registerGlobalShortcut, unregisterGlobalShortcut, closeNotepadWindow } from './notepad/main/notepad-window';
import { registerQuickAIPCHandlers } from './quick-ai/main/quick-ai-management';
import { registerQuickAIGlobalShortcut, unregisterQuickAIGlobalShortcut, closeQuickAIWindow } from './quick-ai/main/quick-ai-window';
import { registerSnippetIPCHandlers } from './snippets/main/snippet-management';
import { registerSnippetShortcut, unregisterSnippetShortcut, closeSnippetWindow } from './snippets/main/snippet-window';
import { registerClipboardHistoryIPCHandlers } from './clipboard-history/main/clipboard-history-management';
import { registerClipboardHistoryShortcut, unregisterClipboardHistoryShortcut, closeClipboardHistoryWindow } from './clipboard-history/main/clipboard-history-window';
import { startClipboardWatcher, stopClipboardWatcher } from './clipboard-history/main/clipboard-watcher';
import { startProjectFolderWatcher, stopProjectFolderWatcher, updateWatcherFolder } from './project/main/project-folder-watcher';
import { loadSettings, setOnProjectFolderChangedCallback } from './settings/main/settings-management';
import { registerTaskIPCHandlers } from './tasks/main/task-management';
import { registerExternalLinksIPCHandlers } from './core/external-links';
import { logStorageConfig } from './core/storage-resolver';
import { registerFeatureSettings } from './settings/main/settings-registry';
import type { NotepadSettings } from './notepad/components/notepad-settings-panel';
import type { SnippetSettings } from './snippets/components/snippet-settings-panel';
import type { ClipboardHistorySettings } from './clipboard-history/components/clipboard-history-settings-panel';
import type { QuickAISettings } from './quick-ai/components/quick-ai-settings-panel';
import type { LLMProviderFeatureSettings, LLMModelFeatureSettings } from './llm/types';
import type { CustomToolsFeatureSettings, MCPToolsFeatureSettings } from './tools/types';
import type { AgentTemplateFeatureSettings } from './agent/types/agent-template';


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
app.whenReady().then(async () => {
  // Log storage configuration for debugging
  logStorageConfig();

  createWindow();

  // Register IPC handlers
  registerIPCHandlers();

  // Register feature settings
  registerFeatureSettings<NotepadSettings>({
    featureId: 'notepad',
    displayName: 'Notepad',
    order: 50,
    defaults: {
      saveLocation: ''
    },
    panelTagName: 'notepad-settings-panel'
  });

  registerFeatureSettings<SnippetSettings>({
    featureId: 'snippets',
    displayName: 'Snippets',
    order: 60,
    defaults: {
      saveLocation: ''
    },
    panelTagName: 'snippet-settings-panel'
  });

  registerFeatureSettings<ClipboardHistorySettings>({
    featureId: 'clipboard-history',
    displayName: 'Clipboard',
    order: 70,
    defaults: {
      saveLocation: ''
    },
    panelTagName: 'clipboard-history-settings-panel'
  });

  registerFeatureSettings<QuickAISettings>({
    featureId: 'quick-ai',
    displayName: 'Quick AI',
    order: 80,
    defaults: {
      defaultProviderId: undefined,
      defaultModelConfigId: undefined
    },
    panelTagName: 'quick-ai-settings-panel'
  });

  // Register LLM child tab features under 'ai' parent tab
  // Providers and Model Configs are stored as part of feature settings
  registerFeatureSettings<LLMProviderFeatureSettings>({
    featureId: 'llm-providers',
    displayName: 'Providers',
    order: 10,
    defaults: {
      providers: []
    },
    panelTagName: 'llm-providers-settings-panel',
    parentTab: 'ai'
  });

  registerFeatureSettings<LLMModelFeatureSettings>({
    featureId: 'llm-model-configs',
    displayName: 'Model Configs',
    order: 20,
    defaults: {
      modelConfigs: []
    },
    panelTagName: 'llm-model-configs-settings-panel',
    parentTab: 'ai'
  });

  registerFeatureSettings<AgentTemplateFeatureSettings>({
    featureId: 'agent-templates',
    displayName: 'Templates',
    order: 25,
    defaults: {
      templates: []
    },
    panelTagName: 'agent-templates-settings-panel',
    parentTab: 'ai'
  });

  // Register Tools child tab features under 'ai' parent tab
  registerFeatureSettings<CustomToolsFeatureSettings>({
    featureId: 'custom-tools',
    displayName: 'Custom Tools',
    order: 30,
    defaults: {
      tools: []
    },
    panelTagName: 'custom-tools-settings-panel',
    parentTab: 'ai'
  });

  registerFeatureSettings<MCPToolsFeatureSettings>({
    featureId: 'mcp-tools',
    displayName: 'MCP Tools',
    order: 40,
    defaults: {
      servers: []
    },
    panelTagName: 'mcp-tools-settings-panel',
    parentTab: 'ai'
  });

  // Initialize MCP servers (connect to all saved servers and cache tools)
  await initializeMCPServers();

  // Register global shortcut for notepad
  registerGlobalShortcut();

  // Register global shortcut for Quick AI
  registerQuickAIGlobalShortcut();

  // Register global shortcut for Snippets
  registerSnippetShortcut();

  // Start clipboard watcher
  startClipboardWatcher();

  // Register global shortcut for Clipboard History
  registerClipboardHistoryShortcut();

  // Start project folder watcher if projectFolder is configured
  const settings = loadSettings();
  if (settings.projectFolder) {
    startProjectFolderWatcher(settings.projectFolder, mainWindow);
  }

  // Set up callback for projectFolder changes
  setOnProjectFolderChangedCallback((newFolder) => {
    updateWatcherFolder(newFolder, mainWindow);
  });

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

  // ============ QUICK AI IPC HANDLERS ============
  registerQuickAIPCHandlers();

  // ============ SNIPPET IPC HANDLERS ============
  registerSnippetIPCHandlers();

  // ============ CLIPBOARD HISTORY IPC HANDLERS ============
  registerClipboardHistoryIPCHandlers();

  // ============ TASK IPC HANDLERS ============
  registerTaskIPCHandlers();

  // ============ EXTERNAL LINKS IPC HANDLERS ============
  registerExternalLinksIPCHandlers();
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up before app quits (called before will-quit)
app.on('before-quit', async () => {
  // Close notepad window first
  closeNotepadWindow();
  // Close Quick AI window
  closeQuickAIWindow();
  // Close snippet window
  closeSnippetWindow();
  // Close clipboard history window
  closeClipboardHistoryWindow();
  // Stop clipboard watcher
  stopClipboardWatcher();
  // Stop project folder watcher
  stopProjectFolderWatcher();
  // Disconnect all MCP servers
  const { disconnectAllMCPServers } = await import('./tools/main/mcp-client');
  await disconnectAllMCPServers();
});

// Clean up shortcuts before app quits
app.on('will-quit', () => {
  // Unregister global shortcuts
  unregisterGlobalShortcut();
  unregisterQuickAIGlobalShortcut();
  unregisterSnippetShortcut();
  unregisterClipboardHistoryShortcut();
});
