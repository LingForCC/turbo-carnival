import type { LLMProvider, ModelConfig, Tool, ConversationMessage } from '../../global.d.ts';
import { streamOpenAI } from './openai';
import { streamAnthropic } from './anthropic';
import { streamGLM } from './glm';
import { getToolByName, validateJSONSchema } from '../tool-management';
import { executeToolWithRouting } from '../openai-client';

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
  toolCalls?: ToolCall[];  // For Anthropic native tool calls
}

export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
}

// ============ MAIN STREAMING FUNCTION ============

/**
 * Main LLM streaming function with provider type routing
 * When enableTools=true, handles complete tool call iteration loop internally
 */
export async function streamLLM(options: StreamLLMOptions): Promise<StreamResult> {
  const {
    systemPrompt,
    messages,
    provider,
    modelConfig,
    tools,
    webContents,
    enableTools = true,
    timeout = 60000,
    agent,
    maxIterations = 10
  } = options;

  // If tools disabled, single pass streaming
  if (!enableTools) {
    const completeMessages = buildCompleteMessages({
      systemPrompt,
      messages,
      tools: undefined
    });

    return await routeToProvider(completeMessages, modelConfig, provider, webContents, timeout);
  }

  // Tool call iteration loop
  let apiMessages = [...messages];
  let iterationCount = 0;

  while (iterationCount < maxIterations) {
    iterationCount++;

    // Build complete messages array
    const completeMessages = buildCompleteMessages({
      systemPrompt,
      messages: apiMessages,
      tools
    });

    // Route to provider-specific streaming function
    const { content: response, hasToolCalls, toolCalls: nativeToolCalls } = await routeToProvider(
      completeMessages,
      modelConfig,
      provider,
      webContents,
      timeout
    );

    // Parse tool calls (provider-specific)
    // Anthropic returns native tool calls in result, OpenAI/GLM need parsing
    let toolCalls = nativeToolCalls || parseToolCalls(response, modelConfig.type);

    // Deduplicate tool calls
    if (toolCalls.length > 0) {
      const seen = new Set<string>();
      const uniqueToolCalls = toolCalls.filter(call => {
        const key = `${call.toolName}|${JSON.stringify(call.parameters)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueToolCalls.length !== toolCalls.length) {
        console.warn(`Detected ${toolCalls.length - uniqueToolCalls.length} duplicate tool calls, removing them`);
        toolCalls = uniqueToolCalls;
      }
    }

    // If no tool calls, return response
    if (toolCalls.length === 0) {
      return { content: response, hasToolCalls: false };
    }

    // Execute tools and add results to messages
    console.log(`Tool call iteration ${iterationCount}: ${toolCalls.length} tools detected`);
    const toolResults = await executeToolCalls(toolCalls, agent, webContents);

    // Add tool results to messages for next iteration
    for (const result of toolResults) {
      apiMessages.push({ role: 'user', content: result });
    }
  }

  // Max iterations reached - return last response with warning
  const completeMessages = buildCompleteMessages({
    systemPrompt,
    messages: apiMessages,
    tools
  });
  const { content: lastResponse } = await routeToProvider(completeMessages, modelConfig, provider, webContents, timeout);

  return {
    content: lastResponse + '\n\n[Note: Maximum tool call rounds reached. Some tool calls may not have been executed.]',
    hasToolCalls: false
  };
}

/**
 * Route to provider-specific streaming function
 */
async function routeToProvider(
  messages: any[],
  modelConfig: ModelConfig,
  provider: LLMProvider,
  webContents: Electron.WebContents,
  timeout: number
): Promise<StreamResult> {
  switch (modelConfig.type) {
    case 'openai':
    case 'custom':
    case 'azure':
      return await streamOpenAI(messages, modelConfig, provider, webContents, timeout);

    case 'anthropic':
      return await streamAnthropic(messages, modelConfig, provider, webContents, timeout);

    case 'glm':
      return await streamGLM(messages, modelConfig, provider, webContents, timeout);

    default:
      throw new Error(`Unsupported provider type: ${modelConfig.type}`);
  }
}

function buildCompleteMessages(options: {
  systemPrompt: string;
  messages: ConversationMessage[];
  tools?: Tool[];
}): any[] {
  const { systemPrompt, messages, tools } = options;

  const result: any[] = [];

  // Add system prompt with tool descriptions if tools are enabled
  if (tools && tools.length > 0) {
    const toolDescriptions = formatToolDescriptions(tools);
    result.push({
      role: 'system',
      content: systemPrompt + toolDescriptions
    });
  } else {
    result.push({
      role: 'system',
      content: systemPrompt
    });
  }

  // Add conversation history
  result.push(...messages.map(msg => ({
    role: msg.role,
    content: msg.content
  })));

  return result;
}

function formatToolDescriptions(tools: Tool[]): string {
  const enabledTools = tools.filter(t => t.enabled);
  if (enabledTools.length === 0) return '';

  let desc = '\n\n# Available Tools\n\nYou have access to the following tools:\n\n';

  for (const tool of enabledTools) {
    desc += `## ${tool.name}\n`;
    desc += `${tool.description}\n`;

    if (tool.parameters && Object.keys(tool.parameters).length > 0) {
      desc += `Parameters: ${JSON.stringify(tool.parameters)}\n`;
    }

    if (tool.returns && Object.keys(tool.returns).length > 0) {
      desc += `Returns: ${JSON.stringify(tool.returns)}\n`;
    }

    desc += '\n';
  }

  desc += 'To use a tool, respond with JSON in the format: {"toolname":"tool_name","arguments":{...}}\n';

  return desc;
}

// ============ TOOL CALL PARSING ============

/**
 * Parse AI response for tool calls (provider-specific)
 * - OpenAI/GLM: Custom JSON format {"toolname":"...","arguments":{...}}
 * - Anthropic: Native tool_use content blocks (extracted in anthropic.ts)
 */
export function parseToolCalls(response: string, providerType: string): ToolCall[] {
  // Anthropic handles tool calls natively in streamAnthropic
  // Tool calls are returned directly in the stream result
  if (providerType === 'anthropic') {
    // Anthropic tool calls should already be extracted
    // Return empty array here - actual tool calls come from streamAnthropic result
    return [];
  }

  // OpenAI/GLM: Parse custom JSON format
  const toolCalls: ToolCall[] = [];
  const pattern = /{\"toolname\":\"(\w+)\",\"arguments\":({.*?})\}/g;
  let match;

  while ((match = pattern.exec(response)) !== null) {
    try {
      toolCalls.push({
        toolName: match[1],
        parameters: JSON.parse(match[2])
      });
    } catch (error) {
      console.warn('Failed to parse tool call:', match[0]);
    }
  }

  return toolCalls;
}

// ============ TOOL EXECUTION ============

/**
 * Execute tool calls with comprehensive error handling and IPC events
 * Consolidated from chat-agent-management.ts
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  agent: any,
  webContents: Electron.WebContents
): Promise<string[]> {
  const toolResults: string[] = [];

  // Send started events and add to history
  for (const toolCall of toolCalls) {
    webContents.send('chat-agent:toolCall', {
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'started'
    });

    agent.history.push({
      role: 'assistant',
      content: `Calling tool: ${toolCall.toolName}`,
      timestamp: Date.now(),
      toolCall: {
        type: 'start',
        toolName: toolCall.toolName,
        parameters: toolCall.parameters,
        status: 'executing'
      }
    });
  }

  // Execute tools
  for (const toolCall of toolCalls) {
    try {
      const tool = getToolByName(toolCall.toolName);
      if (!tool) {
        const errorMsg = `Tool "${toolCall.toolName}" not found`;
        toolResults.push(`Error: ${errorMsg}`);
        handleToolError(webContents, agent, toolCall, errorMsg);
        continue;
      }

      if (!tool.enabled) {
        const errorMsg = `Tool "${toolCall.toolName}" is disabled`;
        toolResults.push(`Error: ${errorMsg}`);
        handleToolError(webContents, agent, toolCall, errorMsg);
        continue;
      }

      const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
      if (validationError) {
        toolResults.push(`Error: ${validationError}`);
        handleToolError(webContents, agent, toolCall, validationError);
        continue;
      }

      const result = await executeToolWithRouting(tool, toolCall.parameters, webContents);
      toolResults.push(
        `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
      );

      handleToolSuccess(webContents, agent, toolCall, result);
    } catch (error: any) {
      const errorMsg = error.message;
      toolResults.push(`Tool "${toolCall.toolName}" failed: ${errorMsg}`);
      handleToolError(webContents, agent, toolCall, errorMsg);
    }
  }

  return toolResults;
}

function handleToolSuccess(
  webContents: Electron.WebContents,
  agent: any,
  toolCall: ToolCall,
  result: any
): void {
  webContents.send('chat-agent:toolCall', {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'completed',
    result: result.result,
    executionTime: result.executionTime
  });

  agent.history.push({
    role: 'user',
    content: `Tool "${toolCall.toolName}" executed successfully`,
    timestamp: Date.now(),
    toolCall: {
      type: 'result',
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      result: result.result,
      executionTime: result.executionTime,
      status: 'completed'
    }
  });
}

function handleToolError(
  webContents: Electron.WebContents,
  agent: any,
  toolCall: ToolCall,
  errorMsg: string
): void {
  webContents.send('chat-agent:toolCall', {
    toolName: toolCall.toolName,
    parameters: toolCall.parameters,
    status: 'failed',
    error: errorMsg
  });

  agent.history.push({
    role: 'user',
    content: `Tool "${toolCall.toolName}" failed`,
    timestamp: Date.now(),
    toolCall: {
      type: 'result',
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'failed',
      error: errorMsg
    }
  });
}
