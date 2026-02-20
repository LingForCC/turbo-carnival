/**
 * Task Management Type Definitions
 * Contains all types and interfaces related to task management functionality
 */

/**
 * Task interface representing a parsed task from TaskPaper format
 */
export interface Task {
  id: string;           // Unique identifier (generated)
  text: string;         // Task text without tags
  projectPath: string;  // Path to the project folder
  projectName: string;  // Name of the project
  indent: number;       // Indentation level (0-based)
  done: boolean;        // Whether task is completed
  doneDate?: Date;      // Date when task was completed (read-only, auto-set)
  defer?: Date;         // Defer date (task not available before this)
  due?: Date;           // Due date
  scheduled?: Date;     // Scheduled date
  children: Task[];     // Child tasks (hierarchical)
  lineNumber: number;   // Original line number in file
}

/**
 * Task file metadata for a project
 */
export interface TaskFile {
  projectPath: string;      // Path to the project folder
  projectName: string;      // Name of the project
  exists: boolean;          // Whether tasks.txt exists
  taskCount: number;        // Number of tasks (excluding empty lines)
  incompleteCount: number;  // Number of incomplete tasks
}

/**
 * Filter type for task display
 */
export type TaskFilter = 'all' | 'available' | 'today' | 'empty';

/**
 * Project with its tasks
 */
export interface ProjectTasks {
  projectPath: string;
  projectName: string;
  tasks: Task[];
  hasFile: boolean;
}

/**
 * All tasks data returned by the API
 */
export interface AllTasksData {
  projects: ProjectTasks[];
  totalCount: number;
  incompleteCount: number;
}

/**
 * Task update payload for partial task updates
 */
export interface TaskUpdate {
  text?: string;
  defer?: Date | null;
  due?: Date | null;
  scheduled?: Date | null;
}

/**
 * New task creation payload
 */
export interface NewTask {
  text: string;
  parentId?: string;      // Add as child of this task
  afterTaskId?: string;   // Insert after this sibling
  projectPath: string;
}

/**
 * Task Management API interface
 * Defines the contract for task management operations
 */
export interface TaskManagementAPI {
  /**
   * Get all tasks from all projects
   * @returns Promise resolving to all tasks data
   */
  getAllTasks(): Promise<AllTasksData>;

  /**
   * Get tasks for a specific project
   * @param projectPath - Full path to the project folder
   * @returns Promise resolving to project tasks
   */
  getProjectTasks(projectPath: string): Promise<ProjectTasks>;

  /**
   * Save tasks to a project's tasks.txt file
   * @param projectPath - Full path to the project folder
   * @param content - TaskPaper content to save
   * @returns Promise resolving when save is complete
   */
  saveTasks(projectPath: string, content: string): Promise<void>;

  /**
   * Toggle task completion status
   * @param projectPath - Full path to the project folder
   * @param taskId - Task ID to toggle
   * @returns Promise resolving to updated project tasks
   */
  toggleTaskDone(projectPath: string, taskId: string): Promise<ProjectTasks>;

  /**
   * Update task properties
   * @param projectPath - Full path to the project folder
   * @param taskId - Task ID to update
   * @param updates - Partial task updates
   * @returns Promise resolving to updated project tasks
   */
  updateTask(projectPath: string, taskId: string, updates: TaskUpdate): Promise<ProjectTasks>;

  /**
   * Add a new task
   * @param newTask - New task data
   * @returns Promise resolving to updated project tasks and new task ID
   */
  addTask(newTask: NewTask): Promise<{ projectTasks: ProjectTasks; newTaskId: string }>;
}
