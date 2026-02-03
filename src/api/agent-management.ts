import type { AgentManagementAPI } from './agent-management.d';
import type { Agent } from './agent-management.d';
import type { ToolCallEvent } from '../global.d';

/**
 * Agent Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Agent Management API implementation for renderer components
 */
const apiInstance: AgentManagementAPI = {
  /**
   * Get all agents for a project
   */
  getAgents: (projectPath: string) => {
    return getElectronAPI().getAgents(projectPath);
  },

  /**
   * Add a new agent to a project
   */
  addAgent: (projectPath: string, agent: Agent) => {
    return getElectronAPI().addAgent(projectPath, agent);
  },

  /**
   * Remove an agent from a project
   */
  removeAgent: (projectPath: string, agentName: string) => {
    return getElectronAPI().removeAgent(projectPath, agentName);
  },

  /**
   * Update an existing agent
   */
  updateAgent: (projectPath: string, agentName: string, agent: Agent) => {
    return getElectronAPI().updateAgent(projectPath, agentName, agent);
  },

  /**
   * Clear chat-agent history
   */
  clearChatAgentHistory: (projectPath: string, agentName: string) => {
    return getElectronAPI().clearChatAgentHistory(projectPath, agentName);
  },

  /**
   * Stream chat-agent message
   */
  streamChatAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    return getElectronAPI().streamChatAgentMessage(
      projectPath,
      agentName,
      message,
      filePaths,
      onChunk,
      onReasoning,
      onComplete,
      onError
    );
  },

  /**
   * Clear app-agent history
   */
  clearAppAgentHistory: (projectPath: string, agentName: string) => {
    return getElectronAPI().clearAppAgentHistory(projectPath, agentName);
  },

  /**
   * Stream app-agent message
   */
  streamAppAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    return getElectronAPI().streamAppAgentMessage(
      projectPath,
      agentName,
      message,
      filePaths,
      onChunk,
      onReasoning,
      onComplete,
      onError
    );
  },

  /**
   * Listen for tool call events during chat-agent streaming
   */
  onToolCallEvent: (callback: (event: ToolCallEvent) => void) => {
    return getElectronAPI().onToolCallEvent(callback);
  },
};

/**
 * Get the AgentManagementAPI instance
 * Returns a singleton instance that implements AgentManagementAPI interface
 */
export function getAgentManagementAPI(): AgentManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const agentManagementAPI = apiInstance;
