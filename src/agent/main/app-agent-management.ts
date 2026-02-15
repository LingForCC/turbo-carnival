import { ipcMain } from 'electron';
import type { Agent } from '../types';
import { loadAgents, saveAgent } from './agent-management';
import { getProviderById } from '../../llm/main/provider-management';
import { getModelConfigById } from '../../llm/main/model-config-management';
import { streamLLM } from '../../llm/main/streaming';

// ============ SYSTEM PROMPT GENERATION ============

/**
 * Generate system prompt for app agents (NO tools, just system prompt)
 */
function generateAppAgentSystemPrompt(agent: Agent): string {
  // App agents don't use tools - just return the system prompt
  return agent.prompts?.system || '';
}

// ============ IPC HANDLERS ============

/**
 * Register app-agent IPC handlers
 */
export function registerAppAgentIPCHandlers(): void {

  // Handler: app-agent:streamMessage
  ipcMain.handle('app-agent:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // 1. Load agent and validate
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    const providerId = agent.config.providerId;
    if (!providerId) {
      throw new Error('Agent does not have a provider configured');
    }

    const provider = getProviderById(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    if (!agent.config.modelId) {
      throw new Error('Agent must have a modelId configured');
    }

    const modelConfig = getModelConfigById(agent.config.modelId);
    if (!modelConfig) {
      throw new Error(`ModelConfig "${agent.config.modelId}" not found`);
    }

    // 2. Build system prompt
    const systemPrompt = generateAppAgentSystemPrompt(agent);

    // 3. Stream response using streamLLM (tools disabled)
    const { content: fullResponse } = await streamLLM({
      systemPrompt,
      filePaths: filePaths || [],
      userMessage: message,
      provider,
      modelConfig,
      tools: [],  // No tools for app agents
      webContents: event.sender,
      enableTools: false,
      agent  // Pass agent for conversation history
    });

    // 4. Send completion event
    saveAgent(projectPath, agent);
    event.sender.send('chat-complete');

    return fullResponse;
  });

  // Handler: app-agent:clearHistory
  ipcMain.handle('app-agent:clearHistory', async (event, projectPath: string, agentName: string) => {
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    // Clear history
    agent.history = [];

    // Save updated agent
    saveAgent(projectPath, agent);

    return { success: true };
  });
}
