import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../global.d.ts';
import { loadAgents, saveAgent } from './agent-management';
import { getAPIKeyByName } from './apiKey-management';
import { loadTools, getToolByName, validateJSONSchema } from './tool-management';
import { callOpenAICompatibleAPI, streamOpenAICompatibleAPI, parseToolCalls, executeToolWithRouting } from './openai-client';

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

// ============ IPC HANDLERS ============

/**
 * Register chat-agent IPC handlers
 */
export function registerChatAgentIPCHandlers(): void {

  // Handler: chat-agent:sendMessage
  ipcMain.handle('chat-agent:sendMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // 1. Load agent
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    // 2. Get API key
    const apiKeyName = agent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      throw new Error('Agent does not have an API key configured');
    }

    const apiKeyEntry = getAPIKeyByName(apiKeyName);
    if (!apiKeyEntry) {
      throw new Error(`API key "${apiKeyName}" not found`);
    }

    // 3. Build messages with tools and files
    const messages = await buildMessagesForChatAgent(agent, message, filePaths);

    // 4. Call API (refactored openai-client accepts pre-built messages)
    const response = await callOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL
    );

    // 5. Extract assistant response
    const assistantMessage = response.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('No response content from API');
    }

    // 6. Check for tool calls
    let toolCalls = parseToolCalls(assistantMessage);

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

    // 7. Execute tools if detected
    if (toolCalls.length > 0) {
      console.log('Tool calls detected:', toolCalls);

      // Save initial exchange
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: assistantMessage, timestamp: Date.now() }
      );

      // Execute tools
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          const tool = getToolByName(toolCall.toolName);
          if (!tool) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" not found`);
            continue;
          }

          if (!tool.enabled) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" is disabled`);
            continue;
          }

          // Validate parameters
          const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
          if (validationError) {
            toolResults.push(`Error: ${validationError}`);
            continue;
          }

          // Execute tool
          const result = await executeToolWithRouting(tool, toolCall.parameters, event.sender);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results to messages
      for (const result of toolResults) {
        messages.push({ role: 'system', content: result });
      }

      // Get final AI response
      const finalResponse = await callOpenAICompatibleAPI(
        messages,
        agent.config,
        apiKeyEntry.apiKey,
        agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL
      );

      const finalMessage = finalResponse.choices?.[0]?.message?.content;
      if (!finalMessage) {
        throw new Error('No response content from API after tool execution');
      }

      // Save final AI response to history
      agent.history.push({ role: 'assistant', content: finalMessage, timestamp: Date.now() });
      saveAgent(projectPath, agent);

      return finalMessage;
    }

    // 8. No tool calls - save and return
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: assistantMessage, timestamp }
    );

    saveAgent(projectPath, agent);

    return assistantMessage;
  });

  // Handler: chat-agent:streamMessage
  ipcMain.handle('chat-agent:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
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

    // 2. Build messages with tools and files
    const messages = await buildMessagesForChatAgent(agent, message, filePaths);

    // 3. Stream response
    const { content: fullResponse, hasToolCalls } = await streamOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
      event.sender
    );

    // 4. Check for tool calls
    let toolCalls = parseToolCalls(fullResponse);

    // Deduplicate
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

    // 5. Execute tools if detected
    if (toolCalls.length > 0) {
      console.log('Tool calls detected in stream:', toolCalls);

      // Save initial exchange
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: fullResponse, timestamp: Date.now() }
      );

      // Execute tools
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          const tool = getToolByName(toolCall.toolName);
          if (!tool || !tool.enabled) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" ${!tool ? 'not found' : 'is disabled'}`);
            continue;
          }

          const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
          if (validationError) {
            toolResults.push(`Error: ${validationError}`);
            continue;
          }

          const result = await executeToolWithRouting(tool, toolCall.parameters, event.sender);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results to messages
      for (const result of toolResults) {
        messages.push({ role: 'system', content: result });
      }

      // Stream final response
      const { content: finalMessage } = await streamOpenAICompatibleAPI(
        messages,
        agent.config,
        apiKeyEntry.apiKey,
        agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
        event.sender
      );

      // Save final AI response to history
      agent.history.push({ role: 'assistant', content: finalMessage, timestamp: Date.now() });
      saveAgent(projectPath, agent);

      // Send completion event
      event.sender.send('chat-complete');

      return finalMessage;
    }

    // 6. No tool calls - save and complete
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
