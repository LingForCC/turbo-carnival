import { ipcMain } from 'electron';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getProviderById } from './provider-management';
import { getModelConfigById } from './model-config-management';
import { loadTools } from './tool-management';
import { streamLLM } from './llm';

// ============ SYSTEM PROMPT GENERATION ============

/**
 * Generate system prompt for chat agents
 * Tool descriptions are now added by streamLLM
 */
function generateChatAgentSystemPrompt(agent: Agent): string {
  return agent.prompts?.system || '';
}

// ============ IPC HANDLERS ============

/**
 * Register chat-agent IPC handlers
 */
export function registerChatAgentIPCHandlers(): void {

  // Handler: chat-agent:streamMessage
  ipcMain.handle('chat-agent:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
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
    const systemPrompt = generateChatAgentSystemPrompt(agent);

    // 3. Single call to streamLLM (handles tool call iteration internally)
    const { content: fullResponse } = await streamLLM({
      systemPrompt,
      filePaths: filePaths || [],
      userMessage: message,
      provider,
      modelConfig,
      tools: loadTools(),
      webContents: event.sender,
      enableTools: true,
      agent,  // Pass agent for conversation history and tool call history
      maxIterations: 10
    });

    // 4. Send completion event
    event.sender.send('chat-complete');

    return fullResponse;
  });

  // Handler: chat-agent:clearHistory
  ipcMain.handle('chat-agent:clearHistory', async (event, projectPath: string, agentName: string) => {
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
