import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getAPIKeyByName } from './apiKey-management';
import { streamOpenAICompatibleAPI } from './openai-client';

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
 * Generate system prompt for app agents (NO tools, just system prompt)
 */
function generateAppAgentSystemPrompt(agent: Agent): string {
  // App agents don't use tools - just return the system prompt
  return agent.prompts?.system || '';
}

/**
 * Build complete messages array for app agent API call
 */
async function buildMessagesForAppAgent(
  agent: Agent,
  userMessage: string,
  filePaths?: string[]
): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = [];

  // 1. System prompt (NO tools)
  const systemPrompt = generateAppAgentSystemPrompt(agent);
  messages.push({ role: 'system', content: systemPrompt });

  // 2. File contents (if provided)
  if (filePaths && filePaths.length > 0) {
    const fileMessages = await buildFileContentMessages(filePaths);
    messages.push(...fileMessages);
  }

  // 3. Conversation history
  if (agent.history && agent.history.length > 0) {
    messages.push(...agent.history.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    })));
  }

  // 4. New user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

// ============ IPC HANDLERS ============

/**
 * Register app-agent IPC handlers
 */
export function registerAppAgentIPCHandlers(): void {

  // Handler: app-agent:streamMessage
  ipcMain.handle('app-agent:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // 1. Load agent and validate API key
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    const apiKeyName = agent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      throw new Error('Agent does not have an API key configured');
    }

    const apiKeyEntry = getAPIKeyByName(apiKeyName);
    if (!apiKeyEntry) {
      throw new Error(`API key "${apiKeyName}" not found`);
    }

    // 2. Build messages (NO tools)
    const messages = await buildMessagesForAppAgent(agent, message, filePaths);

    // 3. Stream response (NO tool detection needed)
    const { content: fullResponse } = await streamOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
      event.sender
    );

    // 4. Update agent history
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: fullResponse, timestamp }
    );

    saveAgent(projectPath, agent);

    // Send completion event
    event.sender.send('chat-complete');

    return fullResponse;
  });
}
