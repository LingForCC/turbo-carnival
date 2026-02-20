/**
 * Task Management Main Process Module
 * Handles IPC for task file operations
 */

import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { loadProjectsFromFolder } from '../../project/main/project-management';
import { getProjectFolder } from '../../project/main/project-management';
import {
  parseTaskPaper,
  serializeTaskPaper,
  toggleTaskDoneInTree,
  countAllTasks,
  countIncompleteTasks
} from '../utils/taskpaper-parser';
import type { Task, ProjectTasks, AllTasksData } from '../types';

/**
 * Read tasks.txt from a project folder
 */
function readTasksFile(projectPath: string, projectName: string): { tasks: Task[]; hasFile: boolean } {
  const tasksFilePath = path.join(projectPath, 'tasks.txt');

  if (!fs.existsSync(tasksFilePath)) {
    return { tasks: [], hasFile: false };
  }

  try {
    const content = fs.readFileSync(tasksFilePath, 'utf-8');
    const tasks = parseTaskPaper(content, projectPath, projectName);
    return { tasks, hasFile: true };
  } catch (error) {
    console.error(`Failed to read tasks file for ${projectPath}:`, error);
    return { tasks: [], hasFile: false };
  }
}

/**
 * Save tasks to a project's tasks.txt file
 */
function saveTasksFile(projectPath: string, tasks: Task[]): void {
  const tasksFilePath = path.join(projectPath, 'tasks.txt');

  try {
    const content = serializeTaskPaper(tasks);
    fs.writeFileSync(tasksFilePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to save tasks file for ${projectPath}:`, error);
    throw error;
  }
}

/**
 * Get all tasks from all projects
 */
async function getAllTasks(): Promise<AllTasksData> {
  const projectFolder = await getProjectFolder();

  if (!projectFolder) {
    return { projects: [], totalCount: 0, incompleteCount: 0 };
  }

  const projects = loadProjectsFromFolder(projectFolder);
  const projectTasks: ProjectTasks[] = [];
  let totalCount = 0;
  let incompleteCount = 0;

  for (const project of projects) {
    const { tasks, hasFile } = readTasksFile(project.path, project.name);
    const taskCount = countAllTasks(tasks);
    const incomplete = countIncompleteTasks(tasks);

    projectTasks.push({
      projectPath: project.path,
      projectName: project.name,
      tasks,
      hasFile
    });

    totalCount += taskCount;
    incompleteCount += incomplete;
  }

  return {
    projects: projectTasks,
    totalCount,
    incompleteCount
  };
}

/**
 * Get tasks for a specific project
 */
async function getProjectTasks(projectPath: string): Promise<ProjectTasks> {
  const projectName = path.basename(projectPath);
  const { tasks, hasFile } = readTasksFile(projectPath, projectName);

  return {
    projectPath,
    projectName,
    tasks,
    hasFile
  };
}

/**
 * Save tasks content to a project
 */
async function saveTasks(projectPath: string, content: string): Promise<void> {
  const tasksFilePath = path.join(projectPath, 'tasks.txt');

  try {
    fs.writeFileSync(tasksFilePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to save tasks for ${projectPath}:`, error);
    throw error;
  }
}

/**
 * Toggle task done status
 */
async function toggleTaskDone(projectPath: string, taskId: string): Promise<ProjectTasks> {
  const projectName = path.basename(projectPath);
  const { tasks, hasFile } = readTasksFile(projectPath, projectName);

  if (!hasFile) {
    throw new Error(`No tasks file found for project: ${projectPath}`);
  }

  const found = toggleTaskDoneInTree(tasks, taskId);

  if (!found) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Save updated tasks back to file
  saveTasksFile(projectPath, tasks);

  return {
    projectPath,
    projectName,
    tasks,
    hasFile: true
  };
}

/**
 * Register all task-related IPC handlers
 */
export function registerTaskIPCHandlers(): void {
  // Handler: Get all tasks from all projects
  ipcMain.handle('tasks:getAll', async () => {
    return await getAllTasks();
  });

  // Handler: Get tasks for a specific project
  ipcMain.handle('tasks:getProject', async (_event, projectPath: string) => {
    return await getProjectTasks(projectPath);
  });

  // Handler: Save tasks content to a project
  ipcMain.handle('tasks:save', async (_event, projectPath: string, content: string) => {
    return await saveTasks(projectPath, content);
  });

  // Handler: Toggle task done status
  ipcMain.handle('tasks:toggleDone', async (_event, projectPath: string, taskId: string) => {
    return await toggleTaskDone(projectPath, taskId);
  });
}
