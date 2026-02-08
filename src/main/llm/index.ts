import { ipcMain } from 'electron';
import type { LLMProvider, ModelConfig } from '../../types/provider-management';
import type { Tool } from '../../types/tool-management';
import type { Agent } from '../../types/agent-management';
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
  toolCallChannel?: string;  // IPC channel for tool call events (default: 'chat-agent:toolCall')
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

// ============ TOOL EXECUTION ============

/**
 * Execute a tool with environment-aware routing
 * Routes to worker process for Node.js tools, or renderer for browser tools
 *
 * Note: Parameter validation should be done by the caller before calling this function
 */
export async function executeToolWithRouting(
  tool: any,
  parameters: Record<string, any>,
  webContents?: Electron.WebContents
): Promise<any> {
  const environment = tool.environment || 'node';

  if (environment === 'browser' && webContents) {
    // Browser tools: Forward to renderer process
    return new Promise((resolve, reject) => {
      const timeout = tool.timeout || 30000;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Browser tool execution timed out after ${timeout}ms`));
      }, timeout);

      const responseHandler = (_event: any, result: any) => {
        cleanup();
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Browser tool execution failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        ipcMain.removeListener('tools:browserResult', responseHandler);
      };

      ipcMain.on('tools:browserResult', responseHandler);
      webContents.send('tools:executeBrowser', {
        code: tool.code,
        parameters,
        timeout
      });
    });
  } else {
    // Node.js tools: Execute in worker process
    const { executeToolInWorker } = await import('../tool-worker-executor');
    return executeToolInWorker(tool, parameters);
  }
}
