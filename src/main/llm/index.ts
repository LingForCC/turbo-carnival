import type { LLMProvider, ModelConfig, Tool, ConversationMessage } from '../../global.d.ts';
import { streamOpenAI } from './openai';
import { streamGLM } from './glm';

// ============ TYPE DEFINITIONS ============

export interface StreamLLMOptions {
  systemPrompt: string;
  messages: ConversationMessage[];
  provider: LLMProvider;
  modelConfig: ModelConfig;
  tools: Tool[];
  webContents: Electron.WebContents;
  enableTools?: boolean;
  timeout?: number;
  agent?: any;  // Agent instance for tool call history
  maxIterations?: number;  // Max tool call rounds (default: 10)
}

export interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

// ============ MAIN STREAMING FUNCTION ============

/**
 * Main LLM streaming function with provider type routing
 * Delegates to provider-specific streaming functions which handle tool calls internally
 */
export async function streamLLM(options: StreamLLMOptions): Promise<StreamResult> {
  const { provider, modelConfig } = options;

  switch (modelConfig.type) {
    case 'openai':
    case 'custom':
    case 'azure':
      return await streamOpenAI(options);

    case 'glm':
      return await streamGLM(options);

    default:
      throw new Error(`Unsupported provider type: ${modelConfig.type}`);
  }
}
