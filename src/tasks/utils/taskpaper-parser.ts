/**
 * TaskPaper Format Parser
 * Parses TaskPaper format files into Task objects and vice versa
 */

import type { Task } from '../types';

/**
 * Parse TaskPaper content into Task objects
 * @param content - TaskPaper format content
 * @param projectPath - Path to the project folder
 * @param projectName - Name of the project
 * @returns Array of Task objects with hierarchy
 */
export function parseTaskPaper(
  content: string,
  projectPath: string,
  projectName: string
): Task[] {
  const lines = content.split('\n');
  const tasks: Task[] = [];
  const taskStack: { task: Task; indent: number }[] = [];
  let taskCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    // Calculate indentation (tabs or spaces)
    const indentMatch = line.match(/^(\t*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Get the actual task text
    const taskText = line.trim();

    // Parse tags from the task text
    const { text, done, defer, due, scheduled } = parseTaskTags(taskText);

    const task: Task = {
      id: `${projectPath}-${++taskCounter}`,
      text,
      projectPath,
      projectName,
      indent,
      done,
      defer,
      due,
      scheduled,
      children: [],
      lineNumber: i + 1
    };

    // Find the parent task based on indentation
    while (taskStack.length > 0 && taskStack[taskStack.length - 1].indent >= indent) {
      taskStack.pop();
    }

    if (taskStack.length === 0) {
      // Top-level task
      tasks.push(task);
    } else {
      // Child task
      taskStack[taskStack.length - 1].task.children.push(task);
    }

    taskStack.push({ task, indent });
  }

  return tasks;
}

/**
 * Parse tags from a task text
 * Supports: @done, @defer(YYYY-MM-DD), @due(YYYY-MM-DD), @scheduled(YYYY-MM-DD)
 */
export function parseTaskTags(taskText: string): {
  text: string;
  done: boolean;
  defer?: Date;
  due?: Date;
  scheduled?: Date;
} {
  let text = taskText;
  let done = false;
  let defer: Date | undefined;
  let due: Date | undefined;
  let scheduled: Date | undefined;

  // Check for @done tag
  if (text.includes('@done')) {
    done = true;
    text = text.replace(/@done/g, '').trim();
  }

  // Parse @defer(date) tag
  const deferMatch = text.match(/@defer\(([^)]+)\)/);
  if (deferMatch) {
    defer = parseDate(deferMatch[1]);
    text = text.replace(/@defer\([^)]+\)/g, '').trim();
  }

  // Parse @due(date) tag
  const dueMatch = text.match(/@due\(([^)]+)\)/);
  if (dueMatch) {
    due = parseDate(dueMatch[1]);
    text = text.replace(/@due\([^)]+\)/g, '').trim();
  }

  // Parse @scheduled(date) tag
  const scheduledMatch = text.match(/@scheduled\(([^)]+)\)/);
  if (scheduledMatch) {
    scheduled = parseDate(scheduledMatch[1]);
    text = text.replace(/@scheduled\([^)]+\)/g, '').trim();
  }

  // Remove @tag without parens that we don't recognize
  text = text.replace(/-\s*/g, '').trim();

  // Add back the dash for tasks
  if (text && !text.startsWith('-')) {
    text = '- ' + text;
  }

  return { text, done, defer, due, scheduled };
}

/**
 * Parse a date string
 * Supports: YYYY-MM-DD, today, tomorrow, +Nd (N days from now)
 */
export function parseDate(dateStr: string): Date | undefined {
  const trimmed = dateStr.trim().toLowerCase();

  // Handle relative dates
  if (trimmed === 'today') {
    return getToday();
  }

  if (trimmed === 'tomorrow') {
    const tomorrow = getToday();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Handle +Nd format (N days from now)
  const relativeMatch = trimmed.match(/^\+(\d+)d?$/);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10);
    const date = getToday();
    date.setDate(date.getDate() + days);
    return date;
  }

  // Handle YYYY-MM-DD format
  const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
    const day = parseInt(dateMatch[3], 10);
    return new Date(year, month, day);
  }

  return undefined;
}

/**
 * Get today's date at midnight
 */
function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Serialize Tasks back to TaskPaper format
 */
export function serializeTaskPaper(tasks: Task[]): string {
  const lines: string[] = [];

  function serializeTask(task: Task, indent: number): void {
    const indentStr = '\t'.repeat(indent);
    let line = task.text;

    // Add tags
    if (task.done) {
      line += ' @done';
    }
    if (task.defer) {
      line += ` @defer(${formatDate(task.defer)})`;
    }
    if (task.due) {
      line += ` @due(${formatDate(task.due)})`;
    }
    if (task.scheduled) {
      line += ` @scheduled(${formatDate(task.scheduled)})`;
    }

    lines.push(indentStr + line);

    // Serialize children
    for (const child of task.children) {
      serializeTask(child, indent + 1);
    }
  }

  for (const task of tasks) {
    serializeTask(task, 0);
  }

  return lines.join('\n');
}

/**
 * Find a task by ID in a task tree
 */
export function findTaskById(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    const found = findTaskById(task.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Set done status for a task and all its children recursively
 */
function setTaskAndChildrenDone(task: Task, done: boolean): void {
  task.done = done;
  for (const child of task.children) {
    setTaskAndChildrenDone(child, done);
  }
}

/**
 * Helper function to toggle task with parent tracking
 * @param tasks - The task list to search
 * @param taskId - The task ID to toggle
 * @param parentChain - Chain of parent tasks from root to immediate parent
 * @returns true if task was found and toggled
 */
function toggleTaskDoneInTreeWithParents(
  tasks: Task[],
  taskId: string,
  parentChain: Task[]
): boolean {
  for (const task of tasks) {
    if (task.id === taskId) {
      const newDoneStatus = !task.done;
      setTaskAndChildrenDone(task, newDoneStatus);

      // If marking as not done, mark all parents as not done too
      if (!newDoneStatus) {
        for (const parent of parentChain) {
          parent.done = false;
        }
      }
      return true;
    }
    // Search in children, adding this task to the parent chain
    if (toggleTaskDoneInTreeWithParents(task.children, taskId, [...parentChain, task])) {
      return true;
    }
  }
  return false;
}

/**
 * Toggle task done status in a task tree
 * - When a parent is marked complete, all children are marked complete
 * - When a child is marked not complete, all parents are marked not complete
 */
export function toggleTaskDoneInTree(tasks: Task[], taskId: string): boolean {
  return toggleTaskDoneInTreeWithParents(tasks, taskId, []);
}

/**
 * Count all tasks (including children)
 */
export function countAllTasks(tasks: Task[]): number {
  let count = 0;
  for (const task of tasks) {
    count++;
    count += countAllTasks(task.children);
  }
  return count;
}

/**
 * Count incomplete tasks (including children)
 */
export function countIncompleteTasks(tasks: Task[]): number {
  let count = 0;
  for (const task of tasks) {
    if (!task.done) {
      count++;
    }
    count += countIncompleteTasks(task.children);
  }
  return count;
}

/**
 * Count done tasks (including children)
 */
export function countDoneTasks(tasks: Task[]): number {
  let count = 0;
  for (const task of tasks) {
    if (task.done) {
      count++;
    }
    count += countDoneTasks(task.children);
  }
  return count;
}

/**
 * Check if a task is available (defer date is not in the future)
 */
export function isTaskAvailable(task: Task): boolean {
  if (task.done) return false;
  if (!task.defer) return true;

  const today = getToday();
  return task.defer <= today;
}

/**
 * Check if a task is due or scheduled for today
 */
export function isTaskToday(task: Task): boolean {
  if (task.done) return false;

  const today = getToday();

  if (task.due) {
    const dueDate = new Date(task.due.getFullYear(), task.due.getMonth(), task.due.getDate());
    if (dueDate.getTime() === today.getTime()) {
      return true;
    }
  }

  if (task.scheduled) {
    const scheduledDate = new Date(task.scheduled.getFullYear(), task.scheduled.getMonth(), task.scheduled.getDate());
    if (scheduledDate.getTime() === today.getTime()) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a task or any of its descendants is scheduled for today or earlier
 * This is used for the Today filter to show parent tasks when a child is scheduled
 */
export function hasTaskOrDescendantScheduledTodayOrEarlier(task: Task): boolean {
  if (task.done) return false;

  const today = getToday();

  // Check if this task is scheduled for today or earlier
  if (task.scheduled) {
    const scheduledDate = new Date(task.scheduled.getFullYear(), task.scheduled.getMonth(), task.scheduled.getDate());
    if (scheduledDate.getTime() <= today.getTime()) {
      return true;
    }
  }

  // Check if task is due today (still use exact match for due dates)
  if (task.due) {
    const dueDate = new Date(task.due.getFullYear(), task.due.getMonth(), task.due.getDate());
    if (dueDate.getTime() === today.getTime()) {
      return true;
    }
  }

  // Recursively check children
  for (const child of task.children) {
    if (hasTaskOrDescendantScheduledTodayOrEarlier(child)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a task is due within N days
 */
export function isTaskDueWithinDays(task: Task, days: number): boolean {
  if (task.done || !task.due) return false;

  const today = getToday();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  return task.due >= today && task.due <= futureDate;
}

/**
 * Find a task and its parent/ancestors in the tree
 * Returns the task, its parent array, and index in that array
 */
export function findTaskAndParent(
  tasks: Task[],
  taskId: string,
  parent: Task[] = tasks
): { task: Task; parentTasks: Task[]; index: number } | null {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === taskId) {
      return { task: tasks[i], parentTasks: parent, index: i };
    }
    const found = findTaskAndParent(tasks[i].children, taskId, tasks[i].children);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Update a task in the tree
 * @param tasks - Task array to update
 * @param taskId - ID of task to update
 * @param updates - Properties to update
 * @returns true if task was found and updated
 */
export function updateTaskInTree(
  tasks: Task[],
  taskId: string,
  updates: { text?: string; defer?: Date | null; due?: Date | null; scheduled?: Date | null }
): boolean {
  for (const task of tasks) {
    if (task.id === taskId) {
      if (updates.text !== undefined) {
        // Preserve the "- " prefix if not already present
        task.text = updates.text.startsWith('- ') ? updates.text : `- ${updates.text}`;
      }
      if (updates.defer !== undefined) {
        task.defer = updates.defer === null ? undefined : updates.defer;
      }
      if (updates.due !== undefined) {
        task.due = updates.due === null ? undefined : updates.due;
      }
      if (updates.scheduled !== undefined) {
        task.scheduled = updates.scheduled === null ? undefined : updates.scheduled;
      }
      return true;
    }
    if (updateTaskInTree(task.children, taskId, updates)) {
      return true;
    }
  }
  return false;
}

/**
 * Add a new task to the tree
 * @param tasks - Task array to modify
 * @param newTask - New task data
 * @param projectPath - Project path for ID generation
 * @param projectName - Project name
 * @returns ID of the newly created task, or null if failed
 */
export function addTaskToTree(
  tasks: Task[],
  newTask: { text: string; parentId?: string; afterTaskId?: string },
  projectPath: string,
  projectName: string
): string | null {
  // Generate a unique ID consistent with parseTaskPaper format
  const taskCounter = countAllTasks(tasks) + 1;
  const newTaskId = `${projectPath}-${taskCounter}`;

  // Create the new task object
  const task: Task = {
    id: newTaskId,
    text: newTask.text.startsWith('- ') ? newTask.text : `- ${newTask.text}`,
    projectPath,
    projectName,
    indent: 0,
    done: false,
    children: [],
    lineNumber: 0 // Will be recalculated on serialization
  };

  if (newTask.parentId) {
    // Add as child of parent
    const parent = findTaskById(tasks, newTask.parentId);
    if (parent) {
      task.indent = parent.indent + 1;
      parent.children.push(task);
      return newTaskId;
    }
    return null;
  } else if (newTask.afterTaskId) {
    // Insert after sibling
    const result = findTaskAndParent(tasks, newTask.afterTaskId);
    if (result) {
      task.indent = result.task.indent;
      result.parentTasks.splice(result.index + 1, 0, task);
      return newTaskId;
    }
    return null;
  } else {
    // Add as top-level task
    tasks.push(task);
    return newTaskId;
  }
}
