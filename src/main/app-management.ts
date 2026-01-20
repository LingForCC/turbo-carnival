import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { App } from '../global.d.ts';

// ============ APP STORAGE HELPERS ============

/**
 * Sanitize app name for use as filename
 * Converts spaces to hyphens, removes special chars
 */
export function sanitizeAppName(name: string): string {
  return name
    .trim()                        // Trim whitespace first
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '') // Remove special chars (keep underscores)
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-');          // Collapse multiple hyphens
}

/**
 * Get the file path for an app's JSON file
 * Naming convention: app-{agent-name}.json (links app to its parent agent)
 */
export function getAppFilePath(projectPath: string, agentName: string): string {
  const sanitizedName = sanitizeAppName(agentName);
  return path.join(projectPath, `app-${sanitizedName}.json`);
}

/**
 * Load an app from a project folder
 */
export function loadApp(projectPath: string, agentName: string): App | null {
  const filePath = getAppFilePath(projectPath, agentName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const app = JSON.parse(content) as App;

    // Validate app has required fields (allow empty strings for html/rendererCode/mainCode)
    if (app.name && app.agentName && typeof app.html === 'string') {
      return app;
    } else {
      console.warn(`Invalid app file: ${filePath}`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to load app file ${filePath}:`, error);
    return null;
  }
}

/**
 * Save an app to a file in the project folder
 */
export function saveApp(projectPath: string, app: App): void {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project folder does not exist: ${projectPath}`);
  }

  const filePath = getAppFilePath(projectPath, app.agentName);

  try {
    // Update timestamp
    app.updatedAt = Date.now();
    fs.writeFileSync(filePath, JSON.stringify(app, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save app to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete an app file
 */
export function deleteAppFile(projectPath: string, agentName: string): void {
  const filePath = getAppFilePath(projectPath, agentName);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete app file ${filePath}:`, error);
      throw error;
    }
  }
}

/**
 * Create a new empty app
 */
export function createApp(agentName: string): App {
  const now = Date.now();
  return {
    name: agentName,
    agentName: agentName,
    html: '<div><!-- App HTML will be generated here --></div>',
    rendererCode: '// Renderer JavaScript code\nconsole.log("App initialized");',
    mainCode: '// Main process JavaScript code\n',
    data: {},
    createdAt: now,
    updatedAt: now
  };
}

// ============ APP IPC HANDLERS ============

/**
 * Register all app-related IPC handlers
 */
export function registerAppIPCHandlers(): void {
  // Handler: Get app for an agent
  ipcMain.handle('apps:get', async (_event, projectPath: string, agentName: string) => {
    return loadApp(projectPath, agentName);
  });

  // Handler: Save or update app
  ipcMain.handle('apps:save', async (_event, projectPath: string, app: App) => {
    // Validate app data
    if (!app.name || !app.agentName) {
      throw new Error('App must have name and agentName');
    }

    // Save app file
    saveApp(projectPath, app);
    return;
  });

  // Handler: Delete app
  ipcMain.handle('apps:delete', async (_event, projectPath: string, agentName: string) => {
    deleteAppFile(projectPath, agentName);
    return;
  });

  // Handler: Execute app main process code
  ipcMain.handle('apps:executeMain', async (_event, projectPath: string, agentName: string, functionName: string, args: any[]) => {
    const app = loadApp(projectPath, agentName);
    if (!app) {
      throw new Error(`App not found for agent: ${agentName}`);
    }

    try {
      // Create a function from the mainCode string
      // We wrap the code to extract the requested function
      const wrappedCode = `
        ${app.mainCode}

        // Check if the requested function exists
        if (typeof ${functionName} === 'function') {
          return ${functionName}(...args);
        } else {
          throw new Error('Function ${functionName} not found in app main code');
        }
      `;

      const appFunction = new Function('args', wrappedCode);

      return await appFunction(args);
    } catch (error: any) {
      console.error(`Failed to execute app main function ${functionName}:`, error);
      throw new Error(`App execution error: ${error.message}`);
    }
  });

  // Handler: Update app data
  ipcMain.handle('apps:updateData', async (_event, projectPath: string, agentName: string, data: Record<string, any>) => {
    const app = loadApp(projectPath, agentName);
    if (!app) {
      throw new Error(`App not found for agent: ${agentName}`);
    }

    app.data = { ...app.data, ...data };
    saveApp(projectPath, app);
    return;
  });
}
