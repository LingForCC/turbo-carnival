import { contextBridge } from 'electron';
import { projectManagement } from './preload/project-management';
import { agentManagement } from './preload/agent-management';
import { providerManagement } from './preload/provider-management';
import { toolManagement } from './preload/tool-management';
import { settingsManagement } from './preload/settings-management';
import { notepadManagement } from './preload/notepad-management';
import { agentTemplateManagement } from './preload/agent-template-management';
import { quickAIManagement } from './preload/quick-ai-management';

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
});
