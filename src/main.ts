import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Project, Agent } from './global.d.ts';
import { registerAgentIPCHandlers, loadAgents, saveAgent } from './main/agent-management';
import { registerApiKeyIPCHandlers, getAPIKeyByName } from './main/apiKey-management';
import { registerOpenAIClientIPCHandlers } from './main/openai-client';
import { registerToolIPCHandlers } from './main/tool-management';

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
  registerToolIPCHandlers();

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
