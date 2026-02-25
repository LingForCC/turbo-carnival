import { ipcMain } from 'electron';
import { executeToolInWorker } from './tool-worker-executor';
import {
  connectToMCPServer,
  disconnectMCPServer,
  testMCPServerConnection,
  getAllCachedMCPTools,
  isMCPServerConnected,
  getCachedToolCount
} from './mcp-client';
import { loadSettings } from '../../settings/main/settings-management';
import { getFeatureDefaults } from '../../settings/main/settings-registry';
import type {
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  JSONSchema,
  BrowserToolExecutionRequest,
  MCPServerConfig
} from '../types';

// ============ TOOL STORAGE HELPERS ============

/**
 * Load all custom tools from settings
 */
function loadCustomTools(): Tool[] {
  const settings = loadSettings();
  const defaults = getFeatureDefaults();
  const featureSettings = settings.features?.['custom-tools'] || defaults['custom-tools'] || {};
  return (featureSettings.tools || []).map((t: Tool) => ({
    ...t,
    toolType: t.toolType || 'custom'
  }));
}

/**
 * Load MCP server configurations from settings
 */
function loadMCPServerConfigs(): MCPServerConfig[] {
  const settings = loadSettings();
  const defaults = getFeatureDefaults();
  const featureSettings = settings.features?.['mcp-tools'] || defaults['mcp-tools'] || {};
  return featureSettings.servers || [];
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
  const servers = loadMCPServerConfigs();

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

// ============ MCP CONFIG VALIDATOR ============

/**
 * Validate MCP server configuration
 */
function validateMCPServerConfig(config: any): string | null {
  if (!config.name || typeof config.name !== 'string') {
    return 'Server name is required and must be a string';
  }

  if (!config.transport || typeof config.transport !== 'string') {
    return 'Transport type is required and must be a string';
  }

  if (config.transport !== 'stdio' && config.transport !== 'streamable-http') {
    return 'Transport must be either "stdio" or "streamable-http"';
  }

  if (config.transport === 'stdio') {
    if (!config.command || typeof config.command !== 'string') {
      return 'stdio transport requires a command';
    }
    if (config.args && !Array.isArray(config.args)) {
      return 'args must be an array';
    }
  }

  if (config.transport === 'streamable-http') {
    if (!config.url || typeof config.url !== 'string') {
      return 'streamable-http transport requires a url';
    }
    try {
      new URL(config.url);
    } catch {
      return 'url must be a valid URL';
    }
  }

  if (config.env && typeof config.env !== 'object') {
    return 'env must be an object';
  }

  if (config.headers && typeof config.headers !== 'object') {
    return 'headers must be an object';
  }

  // Validate header values are strings
  if (config.headers && typeof config.headers === 'object') {
    for (const [key, value] of Object.entries(config.headers)) {
      if (typeof value !== 'string') {
        return `Header value for "${key}" must be a string`;
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

    // Custom tool execution only (MCP tools are handled separately)
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
    const servers = loadMCPServerConfigs();
    // Add runtime connection status and tool count to each server
    return servers.map(server => ({
      ...server,
      connected: isMCPServerConnected(server.name),
      toolCount: getCachedToolCount(server.name)
    }));
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
    const servers = loadMCPServerConfigs();
    const server = servers.find(s => s.name === name);
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
    const servers = loadMCPServerConfigs();
    const server = servers.find(s => s.name === name);
    if (!server) {
      throw new Error(`MCP server "${name}" not found`);
    }

    // Disconnect from MCP server (also clears cache)
    await disconnectMCPServer(name);
  });
}
