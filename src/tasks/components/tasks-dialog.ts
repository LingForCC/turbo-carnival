import { getTaskManagementAPI } from '../api';
import {
  isTaskAvailable,
  isTaskToday,
  isTaskDueWithinDays,
  countAllTasks,
  countIncompleteTasks,
  countDoneTasks
} from '../utils/taskpaper-parser';
import type { Task, AllTasksData, ProjectTasks, TaskFilter } from '../types';

/**
 * TasksDialog Web Component
 * Full-window modal for viewing and managing tasks from all projects
 */
export class TasksDialog extends HTMLElement {
  private allTasksData: AllTasksData | null = null;
  private currentFilter: TaskFilter = 'all';
  private showCompleted: boolean = false;
  private api = getTaskManagementAPI();
  private expandedProjects: Set<string> = new Set();
  private expandedTasks: Set<string> = new Set();

  async connectedCallback(): Promise<void> {
    await this.loadTasks();
    this.render();
  }

  private async loadTasks(): Promise<void> {
    try {
      this.allTasksData = await this.api.getAllTasks();
      // Expand all projects by default
      if (this.allTasksData) {
        for (const project of this.allTasksData.projects) {
          this.expandedProjects.add(project.projectPath);
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.allTasksData = { projects: [], totalCount: 0, incompleteCount: 0 };
    }
  }

  private render(): void {
    if (!this.allTasksData) {
      this.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-gray-500 dark:text-gray-400">Loading tasks...</div></div>';
      return;
    }

    // Filter projects based on current filter
    const filteredProjects = this.getFilteredProjects();

    this.innerHTML = `
      <!-- Full Window Container -->
      <div class="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">Tasks</h2>
            <div class="flex gap-1">
              <button data-filter="all" class="filter-btn px-3 py-1 text-sm rounded-md transition-colors ${this.currentFilter === 'all' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}">
                All
              </button>
              <button data-filter="available" class="filter-btn px-3 py-1 text-sm rounded-md transition-colors ${this.currentFilter === 'available' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}">
                Available
              </button>
              <button data-filter="today" class="filter-btn px-3 py-1 text-sm rounded-md transition-colors ${this.currentFilter === 'today' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}">
                Today
              </button>
              <button data-filter="empty" class="filter-btn px-3 py-1 text-sm rounded-md transition-colors ${this.currentFilter === 'empty' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}">
                Empty
              </button>
            </div>
            <label class="flex items-center gap-2 cursor-pointer ml-4">
              <input
                type="checkbox"
                id="show-completed"
                ${this.showCompleted ? 'checked' : ''}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              >
              <span class="text-sm text-gray-600 dark:text-gray-400">Show Completed</span>
            </label>
          </div>
          <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
            <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left Sidebar: Project List -->
          <div class="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            <div class="p-4">
              <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Projects</h3>
              <div class="space-y-1">
                ${this.renderProjectSidebar(filteredProjects)}
              </div>
            </div>
          </div>

          <!-- Main Content Area: Tasks -->
          <div class="flex-1 overflow-y-auto p-6">
            ${filteredProjects.length === 0 ? `
              <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-lg font-medium">No tasks found</p>
                <p class="text-sm mt-1">Create a tasks.txt file in a project folder to get started.</p>
              </div>
            ` : this.renderTasksContent(filteredProjects)}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private getFilteredProjects(): ProjectTasks[] {
    if (!this.allTasksData) return [];

    switch (this.currentFilter) {
      case 'empty':
        // Show projects without tasks.txt file
        return this.allTasksData.projects.filter(p => !p.hasFile);

      case 'available':
        // Show tasks that are available (defer date not in future)
        return this.allTasksData.projects
          .filter(p => p.hasFile)
          .map(p => ({
            ...p,
            tasks: this.filterAvailableTasks(p.tasks)
          }))
          .filter(p => p.tasks.length > 0);

      case 'today':
        // Show tasks due or scheduled for today
        return this.allTasksData.projects
          .filter(p => p.hasFile)
          .map(p => ({
            ...p,
            tasks: this.filterTodayTasks(p.tasks)
          }))
          .filter(p => p.tasks.length > 0);

      case 'all':
      default:
        // Show all tasks
        return this.allTasksData.projects
          .filter(p => p.hasFile)
          .map(p => ({
            ...p,
            tasks: this.showCompleted ? p.tasks : this.filterIncompleteTasks(p.tasks)
          }))
          .filter(p => p.tasks.length > 0);
    }
  }

  private filterAvailableTasks(tasks: Task[]): Task[] {
    const result: Task[] = [];

    for (const task of tasks) {
      // Skip done tasks
      if (task.done) continue;

      // Filter children first
      const filteredChildren = this.filterAvailableTasks(task.children);

      // If task has children but all are filtered out
      if (task.children.length > 0 && filteredChildren.length === 0) {
        // All children were filtered out - check if any were done (vs deferred)
        const anyChildDone = task.children.some(child => child.done);
        if (!anyChildDone) {
          // All children were hidden due to defer, hide parent too
          continue;
        }
      }

      // If task itself is not available (deferred), don't show
      if (!isTaskAvailable(task)) continue;

      // Task passes the filter
      result.push({
        ...task,
        children: filteredChildren
      });
    }

    return result;
  }

  private filterTodayTasks(tasks: Task[]): Task[] {
    return tasks
      .filter(t => isTaskToday(t))
      .map(t => ({
        ...t,
        children: this.filterTodayTasks(t.children)
      }))
      .filter(t => !t.done && (t.children.length > 0 || t.text));
  }

  private filterIncompleteTasks(tasks: Task[]): Task[] {
    return tasks
      .filter(t => !t.done)
      .map(t => ({
        ...t,
        children: this.filterIncompleteTasks(t.children)
      }))
      .filter(t => t.children.length > 0 || t.text);
  }

  private renderProjectSidebar(projects: ProjectTasks[]): string {
    if (projects.length === 0) {
      return '<p class="text-sm text-gray-500 dark:text-gray-400">No projects</p>';
    }

    return projects.map(project => {
      const incompleteCount = countIncompleteTasks(project.tasks);
      const isExpanded = this.expandedProjects.has(project.projectPath);

      return `
        <div class="project-item cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${isExpanded ? 'bg-gray-100 dark:bg-gray-700' : ''}" data-project-path="${this.escapeHtml(project.projectPath)}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${this.escapeHtml(project.projectName)}</span>
            </div>
            ${incompleteCount > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${incompleteCount}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  private renderTasksContent(projects: ProjectTasks[]): string {
    return projects.map(project => {
      const isExpanded = this.expandedProjects.has(project.projectPath);

      return `
        <div class="project-section mb-6" data-project-section="${this.escapeHtml(project.projectPath)}">
          <div class="project-header flex items-center gap-2 cursor-pointer py-2 border-b border-gray-200 dark:border-gray-700 mb-3" data-project-toggle="${this.escapeHtml(project.projectPath)}">
            <svg class="w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 m-0">${this.escapeHtml(project.projectName)}</h3>
            <span class="text-sm text-gray-500 dark:text-gray-400">${countIncompleteTasks(project.tasks)} tasks</span>
          </div>
          ${isExpanded ? `
            <div class="tasks-list pl-7 space-y-1">
              ${this.renderTasks(project.tasks, 0)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  private renderTasks(tasks: Task[], level: number): string {
    return tasks.map(task => {
      const isExpanded = this.expandedTasks.has(task.id);
      const hasChildren = task.children.length > 0;
      const isDueSoon = isTaskDueWithinDays(task, 7);

      // Calculate child task completion indicator from ORIGINAL task data
      // This ensures the indicator is not affected by filters
      let childIndicator = '';
      const originalTask = this.findOriginalTask(task.id);
      if (originalTask && originalTask.children.length > 0) {
        const totalChildCount = countAllTasks(originalTask.children);
        const doneChildCount = countDoneTasks(originalTask.children);
        childIndicator = `<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">${doneChildCount}/${totalChildCount}</span>`;
      }

      return `
        <div class="task-item ${task.done ? 'opacity-50' : ''} ${isDueSoon && !task.done ? 'bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1' : ''}" data-task-id="${this.escapeHtml(task.id)}">
          <div class="flex items-start gap-2 py-1">
            ${hasChildren ? `
              <button class="task-toggle p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer border-0 bg-transparent flex-shrink-0" data-task-toggle="${this.escapeHtml(task.id)}">
                <svg class="w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ` : '<div class="w-4"></div>'}
            <input
              type="checkbox"
              class="task-checkbox w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0 cursor-pointer"
              data-task-checkbox="${this.escapeHtml(task.id)}"
              ${task.done ? 'checked' : ''}
            >
            <div class="flex-1 min-w-0">
              <span class="task-text text-sm ${task.done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}">
                ${this.escapeHtml(task.text.replace(/^- /, ''))}
              </span>${childIndicator}
              ${task.due ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">due:${this.formatDate(task.due)}</span>` : ''}
              ${task.scheduled ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">scheduled:${this.formatDate(task.scheduled)}</span>` : ''}
              ${task.defer ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">defer:${this.formatDate(task.defer)}</span>` : ''}
            </div>
          </div>
          ${hasChildren && isExpanded ? `
            <div class="tasks-children ml-6 mt-1 space-y-1">
              ${this.renderTasks(task.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Find the original (unfiltered) task by ID from allTasksData
   */
  private findOriginalTask(taskId: string): Task | null {
    if (!this.allTasksData) return null;

    for (const project of this.allTasksData.projects) {
      const found = this.findTaskInTree(project.tasks, taskId);
      if (found) return found;
    }
    return null;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Filter buttons
    const filterBtns = this.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const filter = target.dataset.filter as TaskFilter;
        if (filter) {
          this.currentFilter = filter;
          this.render();
        }
      });
    });

    // Show completed checkbox
    const showCompletedCheckbox = this.querySelector('#show-completed');
    if (showCompletedCheckbox) {
      const newCheckbox = showCompletedCheckbox.cloneNode(true);
      showCompletedCheckbox.replaceWith(newCheckbox);
      (newCheckbox as HTMLElement).addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.showCompleted = target.checked;
        this.render();
      });
    }

    // Project sidebar items
    const projectItems = this.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.replaceWith(newItem);
      (newItem as HTMLElement).addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const projectPath = target.dataset.projectPath;
        if (projectPath) {
          this.toggleProject(projectPath);
        }
      });
    });

    // Project section toggles in main content
    const projectToggles = this.querySelectorAll('.project-header');
    projectToggles.forEach(toggle => {
      const newToggle = toggle.cloneNode(true);
      toggle.replaceWith(newToggle);
      (newToggle as HTMLElement).addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const projectPath = target.dataset.projectToggle;
        if (projectPath) {
          this.toggleProject(projectPath);
        }
      });
    });

    // Task toggles (for expanding/collapsing hierarchy)
    const taskToggles = this.querySelectorAll('.task-toggle');
    taskToggles.forEach(toggle => {
      const newToggle = toggle.cloneNode(true);
      toggle.replaceWith(newToggle);
      (newToggle as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const taskId = target.dataset.taskToggle;
        if (taskId) {
          this.toggleTask(taskId);
        }
      });
    });

    // Task checkboxes
    const taskCheckboxes = this.querySelectorAll('.task-checkbox');
    taskCheckboxes.forEach(checkbox => {
      const newCheckbox = checkbox.cloneNode(true);
      checkbox.replaceWith(newCheckbox);
      (newCheckbox as HTMLElement).addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const taskId = target.dataset.taskCheckbox;
        if (taskId) {
          this.handleTaskToggle(taskId);
        }
      });
    });
  }

  private toggleProject(projectPath: string): void {
    if (this.expandedProjects.has(projectPath)) {
      this.expandedProjects.delete(projectPath);
    } else {
      this.expandedProjects.add(projectPath);
    }
    this.render();
  }

  private toggleTask(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
    this.render();
  }

  private async handleTaskToggle(taskId: string): Promise<void> {
    if (!this.allTasksData) return;

    // Find the project path for this task
    let projectPath: string | undefined;
    for (const project of this.allTasksData.projects) {
      if (this.findTaskInTree(project.tasks, taskId)) {
        projectPath = project.projectPath;
        break;
      }
    }

    if (!projectPath) {
      console.error('Could not find project for task:', taskId);
      return;
    }

    try {
      // Toggle the task
      const updatedProject = await this.api.toggleTaskDone(projectPath, taskId);

      // Update local data
      const projectIndex = this.allTasksData.projects.findIndex(p => p.projectPath === projectPath);
      if (projectIndex !== -1) {
        this.allTasksData.projects[projectIndex] = updatedProject;
      }

      // Re-render
      this.render();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }

  private findTaskInTree(tasks: Task[], taskId: string): Task | null {
    for (const task of tasks) {
      if (task.id === taskId) {
        return task;
      }
      const found = this.findTaskInTree(task.children, taskId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('tasks-dialog-close', {
      bubbles: true,
      composed: true
    }));
    this.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('tasks-dialog', TasksDialog);

// Factory function to create and open the dialog
export function openTasksDialog(): TasksDialog {
  const dialog = document.createElement('tasks-dialog') as TasksDialog;
  document.body.appendChild(dialog);
  return dialog;
}
