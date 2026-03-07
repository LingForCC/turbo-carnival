/**
 * LLM Streaming Module
 *
 * Main entry point for LLM streaming functionality.
 * Delegates to provider-specific streaming implementations.
 */

import type { LLMModelSettings } from '../../types';
import { streamOpenAI } from './openai';
import { streamGLM } from './glm';

// Re-export types from types.ts
export type { StreamLLMOptions, StreamResult, OpenAIToolCall, OpenAIMessage, GLMToolCall, GLMMessage } from './types';

// Re-export tool execution from tool-executor.ts
export { executeToolWithRouting } from './tool-executor';

// ============ MAIN STREAMING FUNCTION ============

/**
 * Main LLM streaming function with provider type routing
 * Delegates to provider-specific streaming functions which handle tool calls internally
 */
export async function streamLLM(options: import('./types').StreamLLMOptions): Promise<import('./types').StreamResult> {
  const { modelConfig } = options;

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
