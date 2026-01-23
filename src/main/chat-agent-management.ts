import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getProviderById } from './provider-management';
import { getModelConfigById } from './model-config-management';
import { loadTools, getToolByName, validateJSONSchema } from './tool-management';
import { streamOpenAICompatibleAPI, parseToolCalls, executeToolWithRouting } from './openai-client';

// ============ OPENAI API TYPES ============

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============ SYSTEM PROMPT GENERATION ============

/**
 * Format tool descriptions for inclusion in system prompt
 * This helps AI agents understand what tools are available and how to use them
 */
function formatToolDescriptions(tools: any[]): string {
  if (tools.length === 0) {
    return '';
  }

  const enabledTools = tools.filter(t => t.enabled);

  if (enabledTools.length === 0) {
    return '';
  }

  let descriptions = '\n\nAvailable Tools:\n';
  descriptions += 'If you decide to use a tool, output ONLY the tool call marker in this exact format:\n';
  descriptions += '{"toolname":"tool_name","arguments":{"param":"value"}}\n\n';

  for (const tool of enabledTools) {
    descriptions += `- ${tool.name}: ${tool.description}\n`;
    descriptions += `  Input: ${JSON.stringify(tool.parameters)}\n`;
    if (tool.returns) {
      descriptions += `  Output: ${JSON.stringify(tool.returns)}\n`;
    }
    descriptions += '\n';
  }

  descriptions += 'IMPORTANT: When calling a tool, output ONLY the tool call marker as a JSON object. ';
  descriptions += 'Do not include any other text before or after the JSON object. ';
  descriptions += 'The JSON object must be valid and contain both "toolname" and "arguments" keys.\n';

  // Anti-duplication rules to prevent tool call multiplication
  descriptions += '\nTOOL USAGE RULES:\n';
  descriptions += '- Call each tool ONLY ONCE per unique input or item\n';
  descriptions += '- Do NOT call the same tool multiple times with the same parameters\n';
  descriptions += '- If processing multiple items (e.g., multiple URLs), call the tool once per item\n';
  descriptions += '- The tool results will contain all necessary information for your response\n';
  descriptions += '- Do NOT call tools again for formatting or translation purposes\n';

  return descriptions;
}

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
 * Generate system prompt for chat agents with tool descriptions
 */
function generateChatAgentSystemPrompt(agent: Agent): string {
  // Load tools
  const tools = loadTools();
  const toolDescriptions = formatToolDescriptions(tools);

  let systemPrompt = agent.prompts?.system || '';
  if (toolDescriptions) {
    systemPrompt += toolDescriptions;
  }

  return systemPrompt;
}

/**
 * Build complete messages array for chat agent API call
 */
async function buildMessagesForChatAgent(
  agent: Agent,
  userMessage: string,
  filePaths?: string[]
): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = [];

  // 1. System prompt with tools
  const systemPrompt = generateChatAgentSystemPrompt(agent);
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

/**
 * Execute tool calls with comprehensive error handling and IPC events
 * @param toolCalls - Array of parsed tool calls to execute
 * @param agent - Agent instance (for history tracking)
 * @param event - IPC event object (for sending status updates)
 * @returns Array of formatted tool result strings to add to messages
 */
async function executeToolCalls(
  toolCalls: any[],
  agent: Agent,
  event: Electron.IpcMainInvokeEvent
): Promise<string[]> {
  const toolResults: string[] = [];

  // For each tool call, save START message to history and emit IPC event
  for (const toolCall of toolCalls) {
    // Emit IPC event for UI
    event.sender.send('chat-agent:toolCall', {
      toolName: toolCall.toolName,
      parameters: toolCall.parameters,
      status: 'started'
    });

    // Save to agent history as assistant message
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
        event.sender.send('chat-agent:toolCall', {
          toolName: toolCall.toolName,
          parameters: toolCall.parameters,
          status: 'failed',
          error: errorMsg
        });
        // Save failed tool call to history
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
        continue;
      }

      if (!tool.enabled) {
        const errorMsg = `Tool "${toolCall.toolName}" is disabled`;
        toolResults.push(`Error: ${errorMsg}`);
        event.sender.send('chat-agent:toolCall', {
          toolName: toolCall.toolName,
          parameters: toolCall.parameters,
          status: 'failed',
          error: errorMsg
        });
        // Save failed tool call to history
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
        continue;
      }

      const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
      if (validationError) {
        toolResults.push(`Error: ${validationError}`);
        event.sender.send('chat-agent:toolCall', {
          toolName: toolCall.toolName,
          parameters: toolCall.parameters,
          status: 'failed',
          error: validationError
        });
        // Save failed tool call to history
        agent.history.push({
          role: 'user',
          content: `Tool "${toolCall.toolName}" failed`,
          timestamp: Date.now(),
          toolCall: {
            type: 'result',
            toolName: toolCall.toolName,
            parameters: toolCall.parameters,
            status: 'failed',
            error: validationError
          }
        });
        continue;
      }

      const result = await executeToolWithRouting(tool, toolCall.parameters, event.sender);
      toolResults.push(
        `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
      );

      // Emit completed event
      event.sender.send('chat-agent:toolCall', {
        toolName: toolCall.toolName,
        parameters: toolCall.parameters,
        status: 'completed',
        result: result.result,
        executionTime: result.executionTime
      });

      // Save completed tool call to history
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
    } catch (error: any) {
      const errorMsg = error.message;
      toolResults.push(`Tool "${toolCall.toolName}" failed: ${errorMsg}`);
      event.sender.send('chat-agent:toolCall', {
        toolName: toolCall.toolName,
        parameters: toolCall.parameters,
        status: 'failed',
        error: errorMsg
      });
      // Save failed tool call to history
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
  }

  return toolResults;
}

// ============ IPC HANDLERS ============

/**
 * Register chat-agent IPC handlers
 */
export function registerChatAgentIPCHandlers(): void {

  // Handler: chat-agent:streamMessage
  ipcMain.handle('chat-agent:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // 1. Load agent and validate API key
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

    // 1.5. Look up ModelConfig and merge with agent config
    let effectiveConfig = { ...agent.config };

    if (agent.config.modelId) {
      const modelConfig = getModelConfigById(agent.config.modelId);
      if (modelConfig) {
        // Merge ModelConfig with agent config (ModelConfig takes precedence for model params)
        effectiveConfig = {
          ...agent.config,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          topP: modelConfig.topP,
          // Keep providerId from agent config
          providerId: agent.config.providerId,
          // Merge extra properties
          ...(modelConfig.extra && { extra: modelConfig.extra }),
        };
      } else {
        console.warn(`ModelConfig "${agent.config.modelId}" not found, using legacy config`);
      }
    }

    // 2. Build messages with tools and files
    const messages = await buildMessagesForChatAgent(agent, message, filePaths);

    // 3. Save user message to history ONCE at the start
    agent.history = agent.history || [];
    agent.history.push({ role: 'user', content: message, timestamp: Date.now() });

    // 4. Iterative tool call loop
    const MAX_ITERATIONS = 10;
    let iterationCount = 0;

    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;

      // 4.1. Make API call
      const { content: response, hasToolCalls } = await streamOpenAICompatibleAPI(
        messages,
        effectiveConfig,
        provider,
        undefined,
        event.sender
      );

      // 4.2. Detect and parse tool calls
      let toolCalls = parseToolCalls(response);

      // 4.3. Deduplicate tool calls
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

      // 4.4. If no tool calls, save response and complete
      if (toolCalls.length === 0) {
        // Save final AI response to history
        agent.history.push({ role: 'assistant', content: response, timestamp: Date.now() });
        saveAgent(projectPath, agent);

        // Send completion event
        event.sender.send('chat-complete');

        return response;
      }

      // 4.5. Execute tools
      console.log(`Tool call iteration ${iterationCount}: ${toolCalls.length} tools detected`);
      const toolResults = await executeToolCalls(toolCalls, agent, event);

      // 4.6. Add tool results to messages for next iteration
      for (const result of toolResults) {
        messages.push({ role: 'user', content: result });
      }

      // Loop continues...
    }

    // 5. Maximum iterations reached - save last response with warning
    const lastResponse = messages[messages.length - 1].content;
    const warningMessage = lastResponse + '\n\n[Note: Maximum tool call rounds reached. Some tool calls may not have been executed.]';

    // Save final AI response with warning to history
    agent.history.push({ role: 'assistant', content: warningMessage, timestamp: Date.now() });
    saveAgent(projectPath, agent);

    // Send completion event
    event.sender.send('chat-complete');

    return warningMessage;
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
