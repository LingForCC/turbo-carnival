import type { TaskManagementAPI, AllTasksData, ProjectTasks, TaskUpdate, NewTask } from '../types';

/**
 * Task Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Task Management API implementation for renderer components
 */
const apiInstance: TaskManagementAPI = {
  /**
   * Get all tasks from all projects
   */
  getAllTasks: (): Promise<AllTasksData> => {
    return getElectronAPI().getAllTasks();
  },

  /**
   * Get tasks for a specific project
   */
  getProjectTasks: (projectPath: string): Promise<ProjectTasks> => {
    return getElectronAPI().getProjectTasks(projectPath);
  },

  /**
   * Save tasks content to a project
   */
  saveTasks: (projectPath: string, content: string): Promise<void> => {
    return getElectronAPI().saveTasks(projectPath, content);
  },

  /**
   * Toggle task done status
   */
  toggleTaskDone: (projectPath: string, taskId: string): Promise<ProjectTasks> => {
    return getElectronAPI().toggleTaskDone(projectPath, taskId);
  },

  /**
   * Update task properties
   */
  updateTask: (projectPath: string, taskId: string, updates: TaskUpdate): Promise<ProjectTasks> => {
    return getElectronAPI().updateTask(projectPath, taskId, updates);
  },

  /**
   * Add a new task
   */
  addTask: (newTask: NewTask): Promise<{ projectTasks: ProjectTasks; newTaskId: string }> => {
    return getElectronAPI().addTask(newTask);
  },
};

/**
 * Get the TaskManagementAPI instance
 * Returns a singleton instance that implements TaskManagementAPI interface
 */
export function getTaskManagementAPI(): TaskManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const taskManagementAPI = apiInstance;

// Re-export types for convenience
export type { Task, TaskFile, TaskFilter, ProjectTasks, AllTasksData, TaskManagementAPI } from '../types';
