/**
 * Shared types for LLM streaming
 * Extracted to avoid circular dependencies between streaming modules
 */

import type { LLMProviderSettings, LLMModelSettings } from '../../types';
import type { Tool } from '../../../tools/types';
import type { Agent } from '../../../agent/types';

// ============ STREAMING OPTIONS ============

export interface StreamLLMOptions {
  systemPrompt: string;
  filePaths?: string[];  // File paths to include as context
  userMessage: string;  // Current user message
  provider: LLMProviderSettings;
  modelConfig: LLMModelSettings;
  tools: Tool[];
  webContents: Electron.WebContents;
  enableTools?: boolean;
  timeout?: number;
  agent: Agent;  // Agent instance for conversation history and tool call history
  maxIterations?: number;  // Max tool call rounds (default: 10)
  toolCallChannel?: string;  // IPC channel for tool call events (default: 'chat-agent:toolCall')
}

export interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

// ============ MESSAGE TYPES ============

/**
 * OpenAI native tool call format
 * Represents a tool call in OpenAI's native response format (used for conversation history)
 */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON stringified arguments
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
  timestamp?: number;
}

/**
 * GLM native tool call format
 * GLM uses OpenAI-compatible tool calling format
 */
export interface GLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON stringified arguments
  };
}

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: GLMToolCall[];
  reasoning_content?: string;  // GLM thinking/reasoning content
  timestamp?: number;
}
