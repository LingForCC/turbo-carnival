import type { LLMProvider, ModelConfig, Tool, Agent } from '../../global.d.ts';
import * as fs from 'fs';
import * as path from 'path';
import { streamOpenAI } from './openai';
import { streamGLM } from './glm';

// ============ TYPE DEFINITIONS ============

export interface StreamLLMOptions {
  systemPrompt: string;
  filePaths?: string[];  // File paths to include as context
  userMessage: string;  // Current user message
  provider: LLMProvider;
  modelConfig: ModelConfig;
  tools: Tool[];
  webContents: Electron.WebContents;
  enableTools?: boolean;
  timeout?: number;
  agent: Agent;  // Agent instance for conversation history and tool call history
  maxIterations?: number;  // Max tool call rounds (default: 10)
}

export interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
  toolCallId?: string;
}

// ============ MESSAGE BUILDING HELPERS ============

/**
 * Build file content messages from file paths
 * Reads file contents and formats them as system messages
 */
export function buildFileContentMessages(filePaths: string[]): any[] {
  const messages: any[] = [];

  if (!filePaths || filePaths.length === 0) {
    return messages;
  }

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
 * Build complete messages array from system prompt, files, agent history, and optional current user message
 * Note: If userMessage is already in agent.history, pass undefined to avoid duplication
 */
export function buildAllMessages(options: {
  systemPrompt: string;
  filePaths?: string[];
  agent: Agent;
  userMessage?: string;
}): any[] {
  const { systemPrompt, filePaths, agent, userMessage } = options;
  const messages: any[] = [];

  // Add system prompt
  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // Add file content messages
  const fileMessages = buildFileContentMessages(filePaths || []);
  messages.push(...fileMessages);

  // Add conversation history from agent
  for (const msg of agent.history || []) {
    const mapped: any = {
      role: msg.role,
      content: msg.content
    };
    if (msg.tool_call_id) {
      mapped.tool_call_id = msg.tool_call_id;
    }
    if (msg.tool_calls) {
      mapped.tool_calls = msg.tool_calls;
    }
    messages.push(mapped);
  }

  // Add current user message if provided
  if (userMessage !== undefined && userMessage !== '') {
    messages.push({
      role: 'user',
      content: userMessage
    });
  }

  return messages;
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
