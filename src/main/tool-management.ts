import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { executeToolInWorker } from './tool-worker-executor';
import type {
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  JSONSchema,
  BrowserToolExecutionRequest
} from '../types/tool-management';

// ============ TOOL STORAGE HELPERS ============

/**
 * Get the file path for tools storage
 */
function getToolsPath(): string {
  return path.join(app.getPath('userData'), 'tools.json');
}

/**
 * Load all tools from storage
 */
export function loadTools(): Tool[] {
  const toolsPath = getToolsPath();
  if (fs.existsSync(toolsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));
      return data.tools || [];
    } catch (error) {
      console.error('Failed to load tools:', error);
      return [];
    }
  }
  return [];
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
 * Get a tool by name
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
    const tools = loadTools();
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
    const tools = loadTools();
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
    const tools = loadTools();
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

    // Route execution based on environment
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
}
