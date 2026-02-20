import { ipcRenderer } from 'electron';
import type { TaskUpdate, NewTask } from '../types';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const taskManagement = {
  // Get all tasks from all projects
  getAllTasks: () => ipcRenderer.invoke('tasks:getAll'),

  // Get tasks for a specific project
  getProjectTasks: (projectPath: string) =>
    ipcRenderer.invoke('tasks:getProject', projectPath),

  // Save tasks content to a project
  saveTasks: (projectPath: string, content: string) =>
    ipcRenderer.invoke('tasks:save', projectPath, content),

  // Toggle task done status
  toggleTaskDone: (projectPath: string, taskId: string) =>
    ipcRenderer.invoke('tasks:toggleDone', projectPath, taskId),

  // Update task properties
  updateTask: (projectPath: string, taskId: string, updates: TaskUpdate) =>
    ipcRenderer.invoke('tasks:updateTask', projectPath, taskId, updates),

  // Add a new task
  addTask: (newTask: NewTask) =>
    ipcRenderer.invoke('tasks:addTask', newTask),
};
