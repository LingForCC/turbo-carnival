import { contextBridge } from 'electron';
import { projectManagement } from './project/preload';
import { agentManagement } from './agent/preload/agent-management';
import { providerManagement } from './llm/preload';
import { toolManagement } from './tools/preload';
import { settingsManagement } from './settings/preload';
import { notepadManagement } from './notepad/preload/notepad-management';
import { agentTemplateManagement } from './agent/preload/agent-template-management';
import { quickAIManagement } from './quick-ai/preload/quick-ai-management';
import { snippetManagement } from './snippets/preload/snippet-management';
import { clipboardHistoryManagement } from './clipboard-history/preload/clipboard-history-management';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  ...projectManagement,

  ...agentManagement,

  ...providerManagement,

  ...toolManagement,

  ...settingsManagement,

  ...notepadManagement,

  ...agentTemplateManagement,

  // Quick AI management
  getQuickAIAgent: quickAIManagement.getAgent,
  streamQuickAIMessage: quickAIManagement.streamMessage,
  clearQuickAIHistory: quickAIManagement.clearHistory,
  validateQuickAISettings: quickAIManagement.validateSettings,
  onQuickAIWindowShown: quickAIManagement.onWindowShown,
  onQuickAIToolCallEvent: quickAIManagement.onToolCallEvent,

  // Snippet management
  ...snippetManagement,

  // Clipboard History management
  ...clipboardHistoryManagement,
});
