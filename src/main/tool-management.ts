import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { executeToolInWorker } from './tool-worker-executor';
import {
  connectToMCPServer,
  disconnectMCPServer,
  executeMCPTool,
  executeMCPToolStream,
  testMCPServerConnection,
  disconnectAllMCPServers,
  getAllCachedMCPTools,
  clearMCPToolsCache,
  isMCPServerConnected,
  getCachedToolCount
} from './mcp-client';
import {
  loadMCPServers,
  saveMCPServers,
  addMCPServer,
  updateMCPServer,
  removeMCPServer,
  getMCPServerByName,
  validateMCPServerConfig
} from './mcp-storage';
import type {
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  JSONSchema,
  BrowserToolExecutionRequest,
  MCPServerConfig
} from '../types/tool-management';

// ============ TOOL STORAGE HELPERS ============

/**
 * Get the file path for tools storage
 */
function getToolsPath(): string {
  return path.join(app.getPath('userData'), 'tools.json');
}

/**
 * Load all tools from storage (custom tools only)
 */
function loadCustomTools(): Tool[] {
  const toolsPath = getToolsPath();
  if (fs.existsSync(toolsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));
      return (data.tools || []).map((t: Tool) => ({
        ...t,
        toolType: t.toolType || 'custom'
      }));
    } catch (error) {
      console.error('Failed to load tools:', error);
      return [];
    }
  }
  return [];
}

/**
 * Discover MCP tools from in-memory cache
 * Tools are loaded at app startup and cached
 */
function discoverMCPTools(): Tool[] {
  return getAllCachedMCPTools();
}

/**
 * Initialize all MCP servers on application startup
 * Connects to all saved MCP servers and caches their tools
 */
export async function initializeMCPServers(): Promise<void> {
  const servers = loadMCPServers();

  for (const server of servers) {
    try {
      await connectToMCPServer(server);
    } catch (error) {
      console.error(`[MCP] Failed to connect to MCP server "${server.name}":`, error);
      // Continue with other servers even if one fails
    }
  }
}

/**
 * Load all tools (custom + MCP)
 */
export function loadTools(): Tool[] {
  const customTools = loadCustomTools();
  const mcpTools = discoverMCPTools();
  return [...customTools, ...mcpTools];
}

/**
 * Save tools to storage
 */
function saveTools(tools: Tool[]): void {
  const toolsPath = getToolsPath();
  const data = { tools };
  try {
    fs.writeFileSync(toolsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save tools:', error);
  }
}

/**
 * Get a tool by name (including MCP tools)
 */
export function getToolByName(name: string): Tool | undefined {
  const tools = loadTools();
  return tools.find(t => t.name === name);
}

// ============ JSON SCHEMA VALIDATOR ============

/**
 * Simple JSON Schema validator
 * Validates parameters against a JSON Schema
 */
export function validateJSONSchema(params: Record<string, any>, schema: JSONSchema): string | null {
  // Check required properties
  if (schema.required) {
    for (const requiredProp of schema.required) {
      if (!(requiredProp in params)) {
        return `Missing required property: ${requiredProp}`;
      }
    }
  }

  // Validate each property
  if (schema.properties) {
    for (const [propName, propValue] of Object.entries(params)) {
      const propSchema = schema.properties[propName];
      if (!propSchema) continue;

      // Type validation
      if (propSchema.type) {
        const actualType = Array.isArray(propValue) ? 'array' : typeof propValue;
        if (actualType !== propSchema.type) {
          return `Property "${propName}" must be ${propSchema.type}, got ${actualType}`;
        }
      }

      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(propValue)) {
        return `Property "${propName}" must be one of: ${propSchema.enum.join(', ')}`;
      }
    }
  }

  return null; // Validation passed
}

// ============ TOOL IPC HANDLERS ============

/**
 * Register all tool-related IPC handlers
 */
export function registerToolIPCHandlers(): void {
  // Handler: Get all tools
  ipcMain.handle('tools:get', () => {
    return loadTools();
  });

  // Handler: Add a new tool
  ipcMain.handle('tools:add', async (_event, tool: Tool) => {
    // Validate tool data
    if (!tool.name || !tool.description || !tool.code) {
      throw new Error('Tool must have name, description, and code');
    }

    if (!tool.parameters || tool.parameters.type !== 'object') {
      throw new Error('Tool parameters must be a valid JSON Schema object');
    }

    // Check for duplicate tool names
    const tools = loadCustomTools();  // Only need custom tools here
    if (tools.some((t: Tool) => t.name === tool.name)) {
      throw new Error(`Tool with name "${tool.name}" already exists`);
    }

    // Validate tool code by attempting to create a function
    try {
      new Function('params', `"use strict"; ${tool.code}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid tool code: ${message}`);
    }

    // Initialize with defaults
    const newTool: Tool = {
      name: tool.name,
      description: tool.description,
      code: tool.code,
      parameters: tool.parameters,
      returns: tool.returns, // Optional
      timeout: tool.timeout || 30000,
      enabled: tool.enabled !== undefined ? tool.enabled : true,
      environment: tool.environment || 'node',
      createdAt: Date.now()
    };

    tools.push(newTool);
    saveTools(tools);
    return tools;
  });

  // Handler: Update an existing tool
  ipcMain.handle('tools:update', async (_event, toolName: string, updatedTool: Tool) => {
    const tools = loadCustomTools();  // Only need custom tools here
    const existingTool = tools.find((t: Tool) => t.name === toolName);

    if (!existingTool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // If name changed, check for conflicts
    if (updatedTool.name !== toolName) {
      if (tools.some((t: Tool) => t.name === updatedTool.name)) {
        throw new Error(`Tool with name "${updatedTool.name}" already exists`);
      }
    }

    // Validate updated tool code
    try {
      new Function('params', `"use strict"; ${updatedTool.code}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid tool code: ${message}`);
    }

    // Update tool
    const index = tools.findIndex((t: Tool) => t.name === toolName);
    tools[index] = {
      ...updatedTool,
      createdAt: existingTool.createdAt, // Preserve creation time
      updatedAt: Date.now()
    };

    saveTools(tools);
    return tools[index];
  });

  // Handler: Remove a tool
  ipcMain.handle('tools:remove', async (_event, toolName: string) => {
    const tools = loadCustomTools();  // Only need custom tools here
    const filtered = tools.filter((t: Tool) => t.name !== toolName);
    saveTools(filtered);
    return filtered;
  });

  // Handler: Execute a tool
  ipcMain.handle('tools:execute', async (event, request: ToolExecutionRequest): Promise<ToolExecutionResult> => {
    let tool: Tool;

    // If full tool data provided, use it directly (for testing unsaved tools)
    if (request.tool) {
      tool = request.tool;
    } else {
      // Otherwise, load from storage by name (for normal tool execution)
      const foundTool = getToolByName(request.toolName);
      if (!foundTool) {
        throw new Error(`Tool "${request.toolName}" not found`);
      }
      tool = foundTool;
    }

    // Check if tool is enabled
    if (!tool.enabled) {
      throw new Error(`Tool "${request.toolName}" is disabled`);
    }

    // Validate parameters against JSON Schema
    const validationError = validateJSONSchema(request.parameters, tool.parameters);
    if (validationError) {
      throw new Error(`Parameter validation failed: ${validationError}`);
    }

    // Route execution based on tool type
    const toolType = tool.toolType || 'custom';

    if (toolType === 'mcp') {
      // MCP tool execution
      if (!tool.mcpServerName || !tool.mcpToolName) {
        throw new Error(`MCP tool "${request.toolName}" is missing server or tool name`);
      }

      if (tool.isStreamable) {
        return await executeMCPToolStream(
          tool.mcpServerName,
          tool.mcpToolName,
          request.parameters,
          (chunk) => event.sender.send('tools:streamChunk', { toolName: request.toolName, chunk })
        );
      }

      const result = await executeMCPTool(
        tool.mcpServerName,
        tool.mcpToolName,
        request.parameters
      );
      return {
        success: true,
        result,
        executionTime: 0
      };
    }

    // Custom tool execution
    const environment = tool.environment || 'node';

    if (environment === 'browser') {
      // Browser tools: Forward to renderer process
      return new Promise<ToolExecutionResult>((resolve, reject) => {
        const timeout = tool.timeout || 30000;
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Browser tool execution timed out after ${timeout}ms`));
        }, timeout);

        // One-time listener for browser tool result
        const responseHandler = (_event: unknown, result: ToolExecutionResult) => {
          cleanup();
          if (result.success) {
            resolve({
              success: true,
              result: result.result,
              executionTime: result.executionTime
            });
          } else {
            reject(new Error(result.error || 'Browser tool execution failed'));
          }
        };

        const cleanup = () => {
          clearTimeout(timer);
          ipcMain.removeListener('tools:browserResult', responseHandler);
        };

        // Use on() instead of once() so we can properly clean up
        ipcMain.on('tools:browserResult', responseHandler);

        // Send execution request to renderer
        const browserRequest: BrowserToolExecutionRequest = {
          code: tool.code,
          parameters: request.parameters,
          timeout
        };
        event.sender.send('tools:executeBrowser', browserRequest);
      });
    } else {
      // Node.js tools: Execute in worker process (existing behavior)
      const result = await executeToolInWorker(tool, request.parameters);
      return result;
    }
  });

  // ============ MCP IPC HANDLERS ============

  // Handler: Get all MCP server configurations (with runtime connection status)
  ipcMain.handle('mcp:getServers', () => {
    const servers = loadMCPServers();
    // Add runtime connection status and tool count to each server
    return servers.map(server => ({
      ...server,
      connected: isMCPServerConnected(server.name),
      toolCount: getCachedToolCount(server.name)
    }));
  });

  // Handler: Add a new MCP server configuration
  ipcMain.handle('mcp:addServer', async (_event, config: MCPServerConfig) => {
    addMCPServer(config);

    // Auto-connect to discover tools and cache them
    try {
      await connectToMCPServer(config);
      return loadMCPServers();
    } catch (error: any) {
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  });

  // Handler: Update an existing MCP server configuration
  ipcMain.handle('mcp:updateServer', async (_event, name: string, config: MCPServerConfig) => {
    const oldServer = getMCPServerByName(name);
    if (oldServer) {
      // Disconnect from old server (also clears cache)
      await disconnectMCPServer(name);
    }

    updateMCPServer(name, config);

    // Reconnect to discover tools and cache them
    try {
      await connectToMCPServer(config);
      return loadMCPServers();
    } catch (error: any) {
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  });

  // Handler: Remove an MCP server configuration
  ipcMain.handle('mcp:removeServer', async (_event, name: string) => {
    // Disconnect from server first (also clears cache)
    await disconnectMCPServer(name);
    return removeMCPServer(name);
  });

  // Handler: Test connection to an MCP server (without saving)
  ipcMain.handle('mcp:testServer', async (_event, config: MCPServerConfig) => {
    const validationError = validateMCPServerConfig(config);
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      const tools = await testMCPServerConnection(config);
      return tools;
    } catch (error: any) {
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  });

  // Handler: Reconnect to an MCP server
  ipcMain.handle('mcp:reconnectServer', async (_event, name: string) => {
    const server = getMCPServerByName(name);
    if (!server) {
      throw new Error(`MCP server "${name}" not found`);
    }

    // Disconnect first (also clears cache)
    await disconnectMCPServer(name);

    // Reconnect
    try {
      const tools = await connectToMCPServer(server);
      return tools;
    } catch (error: any) {
      throw new Error(`Failed to reconnect to MCP server: ${error.message}`);
    }
  });

  // Handler: Disconnect from an MCP server
  ipcMain.handle('mcp:disconnectServer', async (_event, name: string) => {
    const server = getMCPServerByName(name);
    if (!server) {
      throw new Error(`MCP server "${name}" not found`);
    }

    // Disconnect from MCP server (also clears cache)
    await disconnectMCPServer(name);
  });
}
