import { ipcMain } from 'electron';
import type { Agent } from '../types/agent-management';
import { loadSettings } from '../../settings/main/settings-management';
import { getProviderById } from '../../llm/main/provider-management';
import { getModelConfigById } from '../../llm/main/model-config-management';
import { loadTools } from '../../tools/main/tool-management';
import { streamLLM } from '../../llm/main/streaming';

// In-memory agent for Quick AI (conversation history is not persisted)
let quickAIAgent: Agent | null = null;

/**
 * Get or create the in-memory Quick AI agent
 */
function getQuickAIAgent(): Agent {
  if (!quickAIAgent) {
    quickAIAgent = {
      name: 'quick-ai',
      type: 'chat',
      description: 'Quick AI conversation agent',
      config: {},
      prompts: { system: '' }, // Empty system prompt for Quick AI
      history: [],
      settings: {}
    };
  }
  return quickAIAgent;
}

/**
 * Reset the Quick AI agent (clear conversation history)
 */
function resetQuickAIAgent(): void {
  quickAIAgent = null;
}

/**
 * Validate Quick AI settings
 * Checks if default provider and model config are configured
 */
function validateQuickAISettings(): { valid: boolean; error?: string } {
  const settings = loadSettings();

  if (!settings.defaultProviderId) {
    return {
      valid: false,
      error: 'Default provider not configured. Please open Settings and select a default provider for Quick AI.'
    };
  }

  if (!settings.defaultModelConfigId) {
    return {
      valid: false,
      error: 'Default model not configured. Please open Settings and select a default model for Quick AI.'
    };
  }

  // Validate provider exists
  const provider = getProviderById(settings.defaultProviderId);
  if (!provider) {
    return {
      valid: false,
      error: `Default provider "${settings.defaultProviderId}" not found. Please open Settings and select a valid provider.`
    };
  }

  // Validate model config exists
  const modelConfig = getModelConfigById(settings.defaultModelConfigId);
  if (!modelConfig) {
    return {
      valid: false,
      error: `Default model "${settings.defaultModelConfigId}" not found. Please open Settings and select a valid model.`
    };
  }

  // Validate model type matches provider type
  if (modelConfig.type !== provider.type) {
    return {
      valid: false,
      error: `Model type mismatch. Model "${modelConfig.name}" is of type "${modelConfig.type}" but provider "${provider.name}" is of type "${provider.type}". Please select a model that matches the provider type.`
    };
  }

  return { valid: true };
}

/**
 * Register Quick AI IPC handlers
 */
export function registerQuickAIPCHandlers(): void {

  // Handler: quick-ai:getAgent
  ipcMain.handle('quick-ai:getAgent', async () => {
    return getQuickAIAgent();
  });

  // Handler: quick-ai:validateSettings
  ipcMain.handle('quick-ai:validateSettings', async () => {
    return validateQuickAISettings();
  });

  // Handler: quick-ai:streamMessage
  ipcMain.handle('quick-ai:streamMessage', async (event, message: string) => {
    // 1. Validate settings
    const validation = validateQuickAISettings();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const settings = loadSettings();
    const providerId = settings.defaultProviderId!;
    const modelConfigId = settings.defaultModelConfigId!;

    // 2. Load provider and model config
    const provider = getProviderById(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    const modelConfig = getModelConfigById(modelConfigId);
    if (!modelConfig) {
      throw new Error(`ModelConfig "${modelConfigId}" not found`);
    }

    // 3. Get or create Quick AI agent
    const agent = getQuickAIAgent();
    agent.config = {
      providerId,
      modelId: modelConfigId
    };

    // 4. Stream LLM response (with tools enabled, no files)
    const { content: fullResponse } = await streamLLM({
      systemPrompt: '', // Empty system prompt for Quick AI
      filePaths: [],
      userMessage: message,
      provider,
      modelConfig,
      tools: loadTools(), // Load all enabled tools
      webContents: event.sender,
      enableTools: true,
      agent,
      maxIterations: 10, // Allow multiple tool calls
      toolCallChannel: 'quick-ai:toolCall' // Use Quick AI specific tool call channel
    });

    // 5. Send completion event
    event.sender.send('chat-complete');

    return fullResponse;
  });

  // Handler: quick-ai:clearHistory
  ipcMain.handle('quick-ai:clearHistory', async () => {
    resetQuickAIAgent();
    return { success: true };
  });
}
