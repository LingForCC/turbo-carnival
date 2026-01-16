import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Project, Agent } from './global.d.ts';
import { registerAgentIPCHandlers, loadAgents, saveAgent } from './main/agent-management';
import { registerApiKeyIPCHandlers, getAPIKeyByName } from './main/apiKey-management';
import { registerOpenAIClientIPCHandlers, executeToolInWorker } from './main/openai-client';

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
export function loadTools(): any[] {
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
export function getToolByName(name: string): any | undefined {
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

// ============ JSON SCHEMA VALIDATOR ============

/**
 * Simple JSON Schema validator
 * Validates parameters against a JSON Schema
 */
export function validateJSONSchema(params: Record<string, any>, schema: any): string | null {
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
  registerAgentIPCHandlers();

  // ============ API KEY IPC HANDLERS ============
  registerApiKeyIPCHandlers();

  // ============ OPENAI CLIENT IPC HANDLERS ============
  registerOpenAIClientIPCHandlers();

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
