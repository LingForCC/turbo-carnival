import { app, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Project } from '../global.d.ts';

// ============ PROJECT STORAGE HELPERS ============

/**
 * Get the file path for projects.json storage
 */
export function getProjectsPath(): string {
  return path.join(app.getPath('userData'), 'projects.json');
}

/**
 * Load all projects from storage
 */
export function loadProjects(): Project[] {
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

/**
 * Save projects to storage
 */
export function saveProjects(projects: Project[]): void {
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
export function isHidden(name: string): boolean {
  return name.startsWith('.');
}

/**
 * Recursively read directory and build file tree
 */
export function buildFileTree(
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
export function listFilesRecursive(
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

// ============ PROJECT IPC HANDLERS ============

/**
 * Register all project-related IPC handlers
 */
export function registerProjectIPCHandlers(): void {
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
   * Save assistant message content to a file in the project folder
   */
  ipcMain.handle('file:saveToProject', async (event, projectPath: string, content: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: projectPath,
      title: 'Save Assistant Message',
      buttonLabel: 'Save',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');

      // Emit event to notify renderer process about file update
      if (event.sender) {
        event.sender.send('project-file-updated', { projectPath, filePath: result.filePath });
      }

      return result.filePath;
    } catch (error) {
      console.error('Failed to save file:', error);
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
