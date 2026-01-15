import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Project, Agent } from './global.d.ts';

// Storage helpers
function getProjectsPath(): string {
  return path.join(app.getPath('userData'), 'projects.json');
}

function loadProjects(): Project[] {
  const projectsPath = getProjectsPath();
  if (fs.existsSync(projectsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
      return data.projects || [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }
  return [];
}

function saveProjects(projects: Project[]): void {
  const projectsPath = getProjectsPath();
  const data = { projects };
  try {
    fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save projects:', error);
  }
}

// ============ AGENT STORAGE HELPERS ============

/**
 * Sanitize agent name for use as filename
 * Converts spaces to hyphens, removes special chars
 */
function sanitizeAgentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .trim();
}

/**
 * Get the file path for an agent's JSON file
 */
function getAgentFilePath(projectPath: string, agentName: string): string {
  const sanitizedName = sanitizeAgentName(agentName);
  return path.join(projectPath, `agent-${sanitizedName}.json`);
}

/**
 * Load all agents from a project folder
 */
function loadAgents(projectPath: string): Agent[] {
  // Verify project folder exists
  if (!fs.existsSync(projectPath)) {
    console.warn(`Project folder does not exist: ${projectPath}`);
    return [];
  }

  const agents: Agent[] = [];

  try {
    // Read all files in project folder
    const files = fs.readdirSync(projectPath);

    // Filter for agent files (agent-*.json)
    const agentFiles = files.filter(file =>
      file.startsWith('agent-') && file.endsWith('.json')
    );

    // Load each agent file
    for (const file of agentFiles) {
      const filePath = path.join(projectPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const agent = JSON.parse(content) as Agent;

        // Validate agent has required fields
        if (agent.name && agent.type && agent.description) {
          agents.push(agent);
        } else {
          console.warn(`Invalid agent file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to load agent file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to read project folder ${projectPath}:`, error);
  }

  // Sort agents by name
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save an agent to a file in the project folder
 */
function saveAgent(projectPath: string, agent: Agent): void {
  // Verify project folder exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project folder does not exist: ${projectPath}`);
  }

  const filePath = getAgentFilePath(projectPath, agent.name);

  try {
    fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save agent to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete an agent file
 */
function deleteAgent(projectPath: string, agentName: string): void {
  const filePath = getAgentFilePath(projectPath, agentName);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete agent file ${filePath}:`, error);
      throw error;
    }
  }
}

// ============ API KEY STORAGE HELPERS ============

/**
 * Get the file path for API keys storage
 */
function getAPIKeysPath(): string {
  return path.join(app.getPath('userData'), 'api-keys.json');
}

/**
 * Load all API keys from storage
 */
function loadAPIKeys(): any[] {
  const keysPath = getAPIKeysPath();
  if (fs.existsSync(keysPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
      return data.keys || [];
    } catch (error) {
      console.error('Failed to load API keys:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save API keys to storage
 */
function saveAPIKeys(keys: any[]): void {
  const keysPath = getAPIKeysPath();
  const data = { keys };
  try {
    fs.writeFileSync(keysPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save API keys:', error);
  }
}

/**
 * Get an API key by name
 */
function getAPIKeyByName(name: string): any | undefined {
  const keys = loadAPIKeys();
  return keys.find(k => k.name === name);
}

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
function loadTools(): any[] {
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
function saveTools(tools: any[]): void {
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
function getToolByName(name: string): any | undefined {
  const tools = loadTools();
  return tools.find(t => t.name === name);
}

// ============ FILE TREE HELPERS ============

/**
 * Check if a file/directory name is hidden (starts with '.')
 */
function isHidden(name: string): boolean {
  return name.startsWith('.');
}

/**
 * Recursively read directory and build file tree
 */
function buildFileTree(
  dirPath: string,
  options: any = {},
  currentDepth: number = 0
): any[] {
  // Check max depth limit
  if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
    return [];
  }

  // Verify directory exists and is readable
  if (!fs.existsSync(dirPath)) {
    console.warn(`Directory does not exist: ${dirPath}`);
    return [];
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    console.warn(`Path is not a directory: ${dirPath}`);
    return [];
  }

  const nodes: any[] = [];

  try {
    // Read directory contents
    const entries = fs.readdirSync(dirPath);

    // Filter and process each entry
    for (const entry of entries) {
      // Skip hidden files if option is set
      if (options.excludeHidden && isHidden(entry)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry);
      const entryStat = fs.statSync(fullPath);

      // Build node based on type
      if (entryStat.isDirectory()) {
        const node: any = {
          name: entry,
          path: fullPath,
          type: 'directory',
          expanded: false, // Default to collapsed
          children: buildFileTree(fullPath, options, currentDepth + 1)
        };
        nodes.push(node);
      } else if (entryStat.isFile()) {
        // Filter by extension if specified
        if (options.includeExtensions) {
          const ext = path.extname(entry).toLowerCase();
          if (!options.includeExtensions.includes(ext)) {
            continue;
          }
        }

        const node: any = {
          name: entry,
          path: fullPath,
          type: 'file'
        };
        nodes.push(node);
      }
    }

    // Sort: directories first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  } catch (error) {
    console.error(`Failed to read directory ${dirPath}:`, error);
  }

  return nodes;
}

// ============ FILE LISTING HELPERS ============

/**
 * Recursively list all files in directory (flat array)
 * Used for @mention file tagging in chat
 */
function listFilesRecursive(
  dirPath: string,
  options: any = {},
  currentDepth: number = 0
): any[] {
  // Check max depth
  if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
    return [];
  }

  // Verify directory exists
  if (!fs.existsSync(dirPath)) {
    console.warn(`Directory does not exist: ${dirPath}`);
    return [];
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    console.warn(`Path is not a directory: ${dirPath}`);
    return [];
  }

  const files: any[] = [];

  try {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      // Skip hidden files
      if (options.excludeHidden && isHidden(entry)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        // Recurse into subdirectories
        files.push(...listFilesRecursive(fullPath, options, currentDepth + 1));
      } else if (entryStat.isFile()) {
        // Filter by extension
        if (options.extensions) {
          const ext = path.extname(entry).toLowerCase();
          if (!options.extensions.includes(ext)) {
            continue;
          }
        }

        files.push({
          name: entry,
          path: fullPath,
          extension: path.extname(entry).toLowerCase()
        });
      }
    }
  } catch (error) {
    console.error(`Failed to read directory ${dirPath}:`, error);
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

// ============ OPENAI API CLIENT ============

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  messages: OpenAIMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * Call OpenAI-compatible API (non-streaming)
 */
async function callOpenAICompatibleAPI(
  messages: OpenAIMessage[],
  config: any,
  apiKey: string,
  baseURL?: string
): Promise<any> {
  const endpoint = baseURL || 'https://api.openai.com/v1';
  const url = `${endpoint}/chat/completions`;

  const requestBody: OpenAIRequest = {
    messages,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

interface StreamResult {
  content: string;
  hasToolCalls: boolean;
}

/**
 * Call OpenAI-compatible API with streaming
 * Returns the complete accumulated response content and whether tool calls were detected
 * If tool calls are detected during streaming, stops sending chunks to renderer
 */
async function streamOpenAICompatibleAPI(
  messages: OpenAIMessage[],
  config: any,
  apiKey: string,
  baseURL: string | undefined,
  webContents: Electron.WebContents,
  timeout: number = 60000
): Promise<StreamResult> {
  const endpoint = baseURL || 'https://api.openai.com/v1';
  const url = `${endpoint}/chat/completions`;

  const requestBody: OpenAIRequest = {
    messages,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';
    let detectedToolCalls = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonStr = trimmedLine.slice(6);
          const chunk = JSON.parse(jsonStr);

          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;

            // Check if response contains tool call marker
            // Tool call format: <tool_call>tool_name|{"param":"value"}</tool_call>
            if (fullResponse.includes('<tool_call>')) {
              // Tool call detected - stop sending chunks to renderer
              detectedToolCalls = true;
            } else if (!detectedToolCalls) {
              // Only send chunks if we haven't detected tool calls yet
              webContents.send('chat-chunk', content);
            }
          }

          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            // Don't send chat-complete here - let the caller handle it
            // This allows for post-processing (like tool detection) before completion
            return { content: fullResponse, hasToolCalls: detectedToolCalls };
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE chunk:', parseError);
        }
      }
    }

    // Don't send chat-complete here - let the caller handle it
    return { content: fullResponse, hasToolCalls: detectedToolCalls };
  } finally {
    clearTimeout(timeoutId);
  }
}

let mainWindow: BrowserWindow | null = null;

// Check if we're in development mode
// Dev mode if: NODE_ENV is 'development' OR (app is not packaged AND built renderer files don't exist)
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !fs.existsSync(path.join(__dirname, '../dist-renderer/index.html')));

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for Vite dev server
    },
  });

  // Load the index.html of the app
  if (isDev) {
    // In development, load from the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built file
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Register IPC handlers
  registerIPCHandlers();

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Register all IPC handlers
function registerIPCHandlers(): void {
  // Handler: Open folder picker dialog
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Handler: Get all projects
  ipcMain.handle('projects:get', () => {
    return loadProjects();
  });

  // Handler: Add a project
  ipcMain.handle('projects:add', async (_event, folderPath: string) => {
    const projects = loadProjects();

    // Check for duplicates
    if (projects.some(p => p.path === folderPath)) {
      return projects;
    }

    // Add new project
    const newProject: Project = {
      path: folderPath,
      name: path.basename(folderPath),
      addedAt: Date.now()
    };

    projects.push(newProject);
    saveProjects(projects);
    return projects;
  });

  // Handler: Remove a project
  ipcMain.handle('projects:remove', async (_event, folderPath: string) => {
    const projects = loadProjects();
    const filtered = projects.filter(p => p.path !== folderPath);
    saveProjects(filtered);
    return filtered;
  });

  // ============ AGENT IPC HANDLERS ============

  // Handler: Get all agents for a project
  ipcMain.handle('agents:get', async (_event, projectPath: string) => {
    return loadAgents(projectPath);
  });

  // Handler: Add a new agent to a project
  ipcMain.handle('agents:add', async (_event, projectPath: string, agent: Agent) => {
    // Validate agent data
    if (!agent.name || !agent.type || !agent.description) {
      throw new Error('Agent must have name, type, and description');
    }

    // Check for duplicate agent names in this project
    const existingAgents = loadAgents(projectPath);
    if (existingAgents.some(a => a.name === agent.name)) {
      throw new Error(`Agent with name "${agent.name}" already exists in this project`);
    }

    // Initialize with defaults if not provided
    const newAgent: Agent = {
      name: agent.name,
      type: agent.type,
      description: agent.description,
      config: agent.config || { model: 'claude-3.5', temperature: 0.7 },
      prompts: agent.prompts || {},
      history: agent.history || [],
      settings: agent.settings || {}
    };

    // Save agent file
    saveAgent(projectPath, newAgent);

    // Return updated list
    return loadAgents(projectPath);
  });

  // Handler: Remove an agent from a project
  ipcMain.handle('agents:remove', async (_event, projectPath: string, agentName: string) => {
    deleteAgent(projectPath, agentName);
    return loadAgents(projectPath);
  });

  // Handler: Update an existing agent
  ipcMain.handle('agents:update', async (_event, projectPath: string, agentName: string, updatedAgent: Agent) => {
    // Verify agent exists
    const existingAgents = loadAgents(projectPath);
    const existingAgent = existingAgents.find(a => a.name === agentName);

    if (!existingAgent) {
      throw new Error(`Agent "${agentName}" not found in project`);
    }

    // If name changed, check for conflicts and delete old file
    if (updatedAgent.name !== agentName) {
      if (existingAgents.some(a => a.name === updatedAgent.name)) {
        throw new Error(`Agent with name "${updatedAgent.name}" already exists`);
      }
      deleteAgent(projectPath, agentName);
    }

    // Save updated agent
    saveAgent(projectPath, updatedAgent);
    return updatedAgent;
  });

  // ============ API KEY IPC HANDLERS ============

  // Handler: Get all API keys
  ipcMain.handle('api-keys:get', () => {
    return loadAPIKeys();
  });

  // Handler: Add a new API key
  ipcMain.handle('api-keys:add', async (_event, apiKey: any) => {
    const keys = loadAPIKeys();

    // Check for duplicate names
    if (keys.some(k => k.name === apiKey.name)) {
      throw new Error(`API key with name "${apiKey.name}" already exists`);
    }

    keys.push(apiKey);
    saveAPIKeys(keys);
    return keys;
  });

  // Handler: Remove an API key
  ipcMain.handle('api-keys:remove', async (_event, name: string) => {
    const keys = loadAPIKeys();
    const filtered = keys.filter(k => k.name !== name);
    saveAPIKeys(filtered);
    return filtered;
  });

  // ============ JSON SCHEMA VALIDATOR ============

  /**
   * Simple JSON Schema validator
   * Validates parameters against a JSON Schema
   */
  function validateJSONSchema(params: Record<string, any>, schema: any): string | null {
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

  // Handler: Get all tools
  ipcMain.handle('tools:get', () => {
    return loadTools();
  });

  // Handler: Add a new tool
  ipcMain.handle('tools:add', async (_event, tool: any) => {
    // Validate tool data
    if (!tool.name || !tool.description || !tool.code) {
      throw new Error('Tool must have name, description, and code');
    }

    if (!tool.parameters || tool.parameters.type !== 'object') {
      throw new Error('Tool parameters must be a valid JSON Schema object');
    }

    // Check for duplicate tool names
    const tools = loadTools();
    if (tools.some((t: any) => t.name === tool.name)) {
      throw new Error(`Tool with name "${tool.name}" already exists`);
    }

    // Validate tool code by attempting to create a function
    try {
      new Function('params', `"use strict"; ${tool.code}`);
    } catch (error: any) {
      throw new Error(`Invalid tool code: ${error.message}`);
    }

    // Initialize with defaults
    const newTool: any = {
      name: tool.name,
      description: tool.description,
      code: tool.code,
      parameters: tool.parameters,
      returns: tool.returns, // Optional
      timeout: tool.timeout || 30000,
      enabled: tool.enabled !== undefined ? tool.enabled : true,
      createdAt: Date.now()
    };

    tools.push(newTool);
    saveTools(tools);
    return tools;
  });

  // Handler: Update an existing tool
  ipcMain.handle('tools:update', async (_event, toolName: string, updatedTool: any) => {
    const tools = loadTools();
    const existingTool = tools.find((t: any) => t.name === toolName);

    if (!existingTool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // If name changed, check for conflicts
    if (updatedTool.name !== toolName) {
      if (tools.some((t: any) => t.name === updatedTool.name)) {
        throw new Error(`Tool with name "${updatedTool.name}" already exists`);
      }
    }

    // Validate updated tool code
    try {
      new Function('params', `"use strict"; ${updatedTool.code}`);
    } catch (error: any) {
      throw new Error(`Invalid tool code: ${error.message}`);
    }

    // Update tool
    const index = tools.findIndex((t: any) => t.name === toolName);
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
    const filtered = tools.filter((t: any) => t.name !== toolName);
    saveTools(filtered);
    return filtered;
  });

  // Handler: Execute a tool
  ipcMain.handle('tools:execute', async (_event, request: any) => {
    // Load tool
    const tool = getToolByName(request.toolName);
    if (!tool) {
      throw new Error(`Tool "${request.toolName}" not found`);
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

    // Execute tool in worker process
    const result = await executeToolInWorker(tool, request.parameters);
    return result;
  });

  // ============ TOOL CALL PARSING ============

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
    descriptions += 'You can call tools using this format: <tool_call>tool_name|{"param":"value"}</tool_call>\n\n';

    for (const tool of enabledTools) {
      descriptions += `- ${tool.name}: ${tool.description}\n`;
      descriptions += `  Input: ${JSON.stringify(tool.parameters)}\n`;
      if (tool.returns) {
        descriptions += `  Output: ${JSON.stringify(tool.returns)}\n`;
      }
      descriptions += '\n';
    }

    return descriptions;
  }

  /**
   * Parse AI response for tool calls
   * Looks for <tool_call>tool_name|{"param":"value"}</tool_call> format
   */
  function parseToolCalls(response: string): any[] {
    const toolCalls: any[] = [];

    // Pattern: <tool_call>tool_name|{"param":"value"}</tool_call>
    const pattern = /<tool_call>(\w+)\|({.*?})<\/tool_call>/g;
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

  // Handler: Send chat message (non-streaming)
  ipcMain.handle('chat:sendMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // Load agent
    const agents = loadAgents(projectPath);
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    // Get API key
    const apiKeyName = agent.config.apiConfig?.apiKeyRef;
    if (!apiKeyName) {
      throw new Error('Agent does not have an API key configured');
    }

    const apiKeyEntry = getAPIKeyByName(apiKeyName);
    if (!apiKeyEntry) {
      throw new Error(`API key "${apiKeyName}" not found`);
    }

    // Build messages array
    const messages: OpenAIMessage[] = [];

    // Load tools and build enhanced system prompt
    const tools = loadTools();
    const toolDescriptions = formatToolDescriptions(tools);

    let systemPrompt = agent.prompts?.system || '';
    if (toolDescriptions) {
      systemPrompt += toolDescriptions;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add file contents if provided
    if (filePaths && filePaths.length > 0) {
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
    }

    // Add conversation history
    if (agent.history && agent.history.length > 0) {
      messages.push(...agent.history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })));
    }

    // Add new user message
    messages.push({ role: 'user', content: message });

    // Call API
    const response = await callOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL
    );

    // Extract assistant response
    const assistantMessage = response.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('No response content from API');
    }

    // Check for tool calls
    const toolCalls = parseToolCalls(assistantMessage);

    if (toolCalls.length > 0) {
      // Tool calls detected - execute them
      console.log('Tool calls detected:', toolCalls);

      // Save initial exchange (user message + AI response with tool calls)
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: assistantMessage, timestamp: Date.now() }
      );

      // Execute each tool and collect results
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
          const result = await executeToolInWorker(tool, toolCall.parameters);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results as system messages
      for (const result of toolResults) {
        messages.push({ role: 'assistant', content: assistantMessage });
        messages.push({ role: 'system', content: result });
      }

      // Get final AI response after tool execution
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

    // No tool calls - proceed normally
    // Update agent history
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: assistantMessage, timestamp }
    );

    // Save updated agent
    saveAgent(projectPath, agent);

    return response;
  });

  // Handler: Stream chat message
  ipcMain.handle('chat:streamMessage', async (event, projectPath: string, agentName: string, message: string, filePaths?: string[]) => {
    // Validate inputs first
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

    // Build messages array
    const messages: OpenAIMessage[] = [];

    // Load tools and build enhanced system prompt
    const tools = loadTools();
    const toolDescriptions = formatToolDescriptions(tools);

    let systemPrompt = agent.prompts?.system || '';
    if (toolDescriptions) {
      systemPrompt += toolDescriptions;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add file contents if provided
    if (filePaths && filePaths.length > 0) {
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
    }

    if (agent.history && agent.history.length > 0) {
      messages.push(...agent.history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: message });

    // Start streaming and get the full response with tool call detection
    const { content: fullResponse, hasToolCalls } = await streamOpenAICompatibleAPI(
      messages,
      agent.config,
      apiKeyEntry.apiKey,
      agent.config.apiConfig?.baseURL || apiKeyEntry.baseURL,
      event.sender
    );

    // After streaming completes, check for tool calls
    const toolCalls = parseToolCalls(fullResponse);

    if (toolCalls.length > 0) {
      // Tool calls detected - execute them and make a second API call
      console.log('Tool calls detected in stream:', toolCalls);

      // Save initial exchange
      agent.history = agent.history || [];
      agent.history.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: fullResponse, timestamp: Date.now() }
      );

      // Execute each tool and collect results
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          const tool = getToolByName(toolCall.toolName);
          if (!tool || !tool.enabled) {
            toolResults.push(`Error: Tool "${toolCall.toolName}" ${!tool ? 'not found' : 'is disabled'}`);
            continue;
          }

          // Validate parameters
          const validationError = validateJSONSchema(toolCall.parameters, tool.parameters);
          if (validationError) {
            toolResults.push(`Error: ${validationError}`);
            continue;
          }

          // Execute tool
          const result = await executeToolInWorker(tool, toolCall.parameters);
          toolResults.push(
            `Tool "${toolCall.toolName}" executed successfully:\n${JSON.stringify(result.result, null, 2)}\n(Execution time: ${result.executionTime}ms)`
          );
        } catch (error: any) {
          toolResults.push(`Tool "${toolCall.toolName}" failed: ${error.message}`);
        }
      }

      // Add tool results as system messages
      for (const result of toolResults) {
        messages.push({ role: 'assistant', content: fullResponse });
        messages.push({ role: 'system', content: result });
      }

      // Stream the final response (second API call with tool results)
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

      // Send completion event to renderer
      event.sender.send('chat-complete');

      return finalMessage;
    }

    // No tool calls - proceed normally
    // Update agent history with the conversation
    const timestamp = Date.now();
    agent.history = agent.history || [];
    agent.history.push(
      { role: 'user', content: message, timestamp },
      { role: 'assistant', content: fullResponse, timestamp }
    );

    // Save updated agent
    saveAgent(projectPath, agent);

    // Send completion event to renderer
    event.sender.send('chat-complete');

    return fullResponse;
  });

  // ============ TOOL WORKER EXECUTION ============

  /**
   * Execute tool code in a separate worker process
   * This provides isolation and prevents tool code from crashing the main process
   */
  async function executeToolInWorker(tool: any, parameters: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'tool-worker.js');
      const timeout = tool.timeout || 30000;

      try {
        // Spawn worker process
        const worker = require('child_process').fork(workerPath, {
          silent: true, // Don't share stdio
          env: {
            ...process.env,
            NODE_ENV: process.env.NODE_ENV || 'production'
          }
        });

        let responseReceived = false;

        // Listen for messages from worker (responses)
        worker.on('message', (response: any) => {
          if (responseReceived) return; // Ignore duplicate messages
          responseReceived = true;

          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Tool execution failed'));
          }

          // Clean up worker
          worker.kill();
        });

        // Listen for errors from worker
        worker.on('error', (error: Error) => {
          if (responseReceived) return;
          responseReceived = true;
          reject(new Error(`Worker error: ${error.message}`));
          worker.kill();
        });

        // Handle worker exit
        worker.on('exit', (code: number) => {
          if (!responseReceived) {
            responseReceived = true;
            if (code !== 0) {
              reject(new Error(`Worker process exited with code ${code}`));
            } else {
              reject(new Error('Worker exited without sending response'));
            }
          }
        });

        // Send execution request to worker
        worker.send({
          type: 'execute',
          code: tool.code,
          parameters,
          timeout
        });

      } catch (error: any) {
        reject(new Error(`Failed to spawn worker: ${error.message}`));
      }
    });
  }

  // ============ PROJECT DETAIL IPC HANDLERS ============

  /**
   * Get file tree for a project directory
   */
  ipcMain.handle('project:getFileTree', async (_event, projectPath: string, options?: any) => {
    // Default options
    const fileTreeOptions: any = {
      maxDepth: options?.maxDepth,
      excludeHidden: options?.excludeHidden ?? true, // Default: exclude hidden files
      includeExtensions: options?.includeExtensions
    };

    try {
      const fileTree = buildFileTree(projectPath, fileTreeOptions);
      return fileTree;
    } catch (error) {
      console.error('Failed to build file tree:', error);
      throw error;
    }
  });

  // ============ FILE READING IPC HANDLERS ============

  /**
   * List all .txt and .md files in project
   */
  ipcMain.handle('files:list', async (_event, projectPath: string, options?: any) => {
    const fileListOptions: any = {
      extensions: options?.extensions || ['.txt', '.md'],
      maxDepth: options?.maxDepth || 10, // Default: search 10 levels deep
      excludeHidden: options?.excludeHidden ?? true
    };

    try {
      const files = listFilesRecursive(projectPath, fileListOptions);
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  });

  /**
   * Read multiple files at once (batch operation)
   */
  ipcMain.handle('files:readContents', async (_event, filePaths: string[]) => {
    const results: any[] = [];

    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          results.push({
            path: filePath,
            name: path.basename(filePath),
            content: '',
            size: 0,
            error: 'File not found'
          });
          continue;
        }

        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          results.push({
            path: filePath,
            name: path.basename(filePath),
            content: '',
            size: 0,
            error: 'Path is not a file'
          });
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        results.push({
          path: filePath,
          name: path.basename(filePath),
          content: content,
          size: stat.size
        });
      } catch (error: any) {
        console.error(`Failed to read file ${filePath}:`, error);
        results.push({
          path: filePath,
          name: path.basename(filePath),
          content: '',
          size: 0,
          error: error.message || 'Failed to read file'
        });
      }
    }

    return results;
  });
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
