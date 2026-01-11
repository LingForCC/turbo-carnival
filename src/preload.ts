import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Agent } from './global.d.ts';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  platform: process.platform,

  // Open folder picker dialog
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Get all saved projects
  getProjects: () => ipcRenderer.invoke('projects:get'),

  // Add a new project
  addProject: (folderPath: string) => ipcRenderer.invoke('projects:add', folderPath),

  // Remove a project
  removeProject: (folderPath: string) => ipcRenderer.invoke('projects:remove', folderPath),

  // ============ AGENT METHODS ============

  // Get all agents for a project
  getAgents: (projectPath: string) => ipcRenderer.invoke('agents:get', projectPath),

  // Add a new agent to a project
  addAgent: (projectPath: string, agent: Agent) =>
    ipcRenderer.invoke('agents:add', projectPath, agent),

  // Remove an agent from a project
  removeAgent: (projectPath: string, agentName: string) =>
    ipcRenderer.invoke('agents:remove', projectPath, agentName),

  // Update an existing agent
  updateAgent: (projectPath: string, agentName: string, agent: Agent) =>
    ipcRenderer.invoke('agents:update', projectPath, agentName, agent),
});
