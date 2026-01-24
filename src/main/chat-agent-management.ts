import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getProviderById } from './provider-management';
import { getModelConfigById } from './model-config-management';
import { loadTools } from './tool-management';
import { streamLLM } from './llm';

// ============ OPENAI API TYPES ============

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============ SYSTEM PROMPT GENERATION ============

/**
 * Build file content messages
 * Reads file contents and formats them as system messages
 */
async function buildFileContentMessages(filePaths: string[]): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = [];

  for (const filePath of filePaths) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      messages.push({
        role: 'system',
        content: `[File: ${fileName}]\n${fileContent}`
      });
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
    }
  }

  return messages;
}

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

    // 2. Build messages
    const systemPrompt = generateChatAgentSystemPrompt(agent);
    const fileMessages = await buildFileContentMessages(filePaths || []);

    const conversationMessages = agent.history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const allMessages = [
      ...fileMessages,
      ...conversationMessages,
      { role: 'user', content: message }
    ];

    // 3. Save user message to history
    agent.history = agent.history || [];
    agent.history.push({ role: 'user', content: message, timestamp: Date.now() });

    // 4. Single call to streamLLM (handles tool call iteration internally)
    const { content: fullResponse } = await streamLLM({
      systemPrompt,
      messages: allMessages,
      provider,
      modelConfig,
      tools: loadTools(),
      webContents: event.sender,
      enableTools: true,
      agent,  // Pass agent for tool call history
      maxIterations: 10
    });

    // 5. Save assistant response to history
    agent.history.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
    saveAgent(projectPath, agent);
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
