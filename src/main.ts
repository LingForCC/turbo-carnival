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
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
