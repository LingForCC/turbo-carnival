import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Project } from './global.d.ts';

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
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
