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

  // Task selection and editing state
  private selectedTaskId: string | null = null;
  private editingTaskId: string | null = null;
  private editCursorPosition: number | null = null;
  private datePickerTaskId: string | null = null;
  private datePickerType: 'defer' | 'due' | 'scheduled' | null = null;

  async connectedCallback(): Promise<void> {
    await this.loadTasks();
    this.render();
    this.attachGlobalListeners();
  }

  disconnectedCallback(): void {
    this.removeGlobalListeners();
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
          <div class="flex-1 overflow-y-auto p-6" id="tasks-main-content">
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

        <!-- Keyboard Shortcuts Hint -->
        <div class="flex-shrink-0 px-6 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div class="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
            <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">${this.isMac() ? 'Cmd' : 'Ctrl'}+N</kbd> New sibling</span>
            <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift+${this.isMac() ? 'Cmd' : 'Ctrl'}+N</kbd> New child</span>
            <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> Edit</span>
            <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> Cancel</span>
            <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Arrow Keys</kbd> Navigate</span>
          </div>
        </div>
      </div>

      <!-- Date Picker Popover (rendered at root level for proper positioning) -->
      ${this.datePickerTaskId && this.datePickerType ? this.renderDatePickerPopover() : ''}
    `;

    this.attachEventListeners();
  }

  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
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
              ${this.renderTasks(project.tasks, 0, project.projectPath)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  private renderTasks(tasks: Task[], level: number, projectPath: string): string {
    return tasks.map(task => {
      const isExpanded = this.expandedTasks.has(task.id);
      const hasChildren = task.children.length > 0;
      const isDueSoon = isTaskDueWithinDays(task, 7);
      const isSelected = this.selectedTaskId === task.id;
      const isEditing = this.editingTaskId === task.id;

      // Calculate child task completion indicator from ORIGINAL task data
      // This ensures the indicator is not affected by filters
      let childIndicator = '';
      const originalTask = this.findOriginalTask(task.id);
      if (originalTask && originalTask.children.length > 0) {
        const totalChildCount = countAllTasks(originalTask.children);
        const doneChildCount = countDoneTasks(originalTask.children);
        childIndicator = `<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">${doneChildCount}/${totalChildCount}</span>`;
      }

      const taskText = task.text.replace(/^- /, '');

      return `
        <div class="task-item group ${task.done ? 'opacity-50' : ''}" data-task-id="${this.escapeHtml(task.id)}" data-project-path="${this.escapeHtml(projectPath)}">
          <div class="task-row flex items-start gap-2 py-1 ${isDueSoon && !task.done ? 'bg-orange-50 dark:bg-orange-900/20 rounded px-2 -mx-2' : ''} ${isSelected && !isEditing ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded px-2 -mx-2' : ''}">
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
              ${isEditing ? `
                <input
                  type="text"
                  class="task-edit-input w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200"
                  value="${this.escapeHtml(taskText)}"
                  data-task-edit="${this.escapeHtml(task.id)}"
                >
              ` : `
                <span class="task-text text-sm ${task.done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}" data-task-text="${this.escapeHtml(task.id)}">
                  ${this.escapeHtml(taskText)}
                </span>${childIndicator}
                ${this.renderDateTags(task)}
              `}
            </div>
          </div>
          ${hasChildren && isExpanded ? `
            <div class="tasks-children ml-6 mt-1 space-y-1">
              ${this.renderTasks(task.children, level + 1, projectPath)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  private renderDateTags(task: Task): string {
    const tags: string[] = [];

    if (task.due) {
      tags.push(this.renderDateTag(task, 'due'));
    }
    if (task.scheduled) {
      tags.push(this.renderDateTag(task, 'scheduled'));
    }
    if (task.defer) {
      tags.push(this.renderDateTag(task, 'defer'));
    }

    // Add buttons to add missing dates (visible on hover)
    const missingTags: string[] = [];
    if (!task.due) {
      missingTags.push(`<button class="add-date-btn opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1" data-add-date="due" data-task-id="${this.escapeHtml(task.id)}">+due</button>`);
    }
    if (!task.scheduled) {
      missingTags.push(`<button class="add-date-btn opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1" data-add-date="scheduled" data-task-id="${this.escapeHtml(task.id)}">+scheduled</button>`);
    }
    if (!task.defer) {
      missingTags.push(`<button class="add-date-btn opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1" data-add-date="defer" data-task-id="${this.escapeHtml(task.id)}">+defer</button>`);
    }

    const allTags = tags.length > 0 ? tags.join('') : '';
    const addButtons = missingTags.join('');

    return `<span class="date-tags ml-2 flex items-center gap-1">${allTags}${addButtons}</span>`;
  }

  private renderDateTag(task: Task, type: 'defer' | 'due' | 'scheduled'): string {
    const date = task[type];
    if (!date) return '';

    const dateStr = this.formatDate(date);
    const colorClass = type === 'due' ? 'text-red-500 dark:text-red-400' :
                       type === 'scheduled' ? 'text-green-500 dark:text-green-400' :
                       'text-gray-500 dark:text-gray-400';

    return `<button class="date-tag text-xs ${colorClass} hover:underline cursor-pointer bg-transparent border-0 p-0" data-date-tag="${type}" data-task-id="${this.escapeHtml(task.id)}">${type}:${dateStr}</button>`;
  }

  private renderDatePickerPopover(): string {
    if (!this.datePickerTaskId || !this.datePickerType) return '';

    // Get current date value
    let currentDate = '';
    const task = this.findOriginalTask(this.datePickerTaskId);
    if (task && task[this.datePickerType]) {
      currentDate = this.formatDate(task[this.datePickerType]!);
    }

    return `
      <div class="date-picker-popover fixed inset-0 z-[100]" id="date-picker-overlay">
        <div class="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 w-64" id="date-picker-panel">
          <div class="flex flex-col gap-2">
            <label class="text-sm text-gray-700 dark:text-gray-300 capitalize">${this.datePickerType} Date</label>
            <input
              type="date"
              id="date-picker-input"
              value="${currentDate}"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
            <div class="flex gap-2 justify-end mt-2">
              <button id="date-picker-clear" class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                Clear
              </button>
              <button id="date-picker-save" class="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
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

  private attachGlobalListeners(): void {
    // Use arrow functions to preserve 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private removeGlobalListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Ignore if focus is on input/textarea (except for Escape)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

    // Escape key - cancel editing or close date picker
    if (e.key === 'Escape') {
      if (this.datePickerTaskId) {
        this.closeDatePicker();
        return;
      }
      if (this.editingTaskId) {
        this.cancelEditing();
        return;
      }
      return;
    }

    // If editing, only handle specific keys
    if (this.editingTaskId) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.saveEditing();
      }
      return;
    }

    // Don't handle shortcuts if input is focused
    if (isInputFocused) return;

    // Enter key - start editing selected task
    if (e.key === 'Enter' && this.selectedTaskId) {
      e.preventDefault();
      this.startEditing(this.selectedTaskId);
      return;
    }

    // Arrow keys - navigate tasks
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigateTasks(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    // Cmd+N / Ctrl+N - add sibling task
    const isModKey = this.isMac() ? e.metaKey : e.ctrlKey;
    if (isModKey && e.key === 'n' && !e.shiftKey && this.selectedTaskId) {
      e.preventDefault();
      this.addSiblingTask();
      return;
    }

    // Shift+Cmd+N / Shift+Ctrl+N - add child task
    if (isModKey && e.shiftKey && e.key === 'N' && this.selectedTaskId) {
      e.preventDefault();
      this.addChildTask();
      return;
    }
  }

  private getVisibleTaskIds(): string[] {
    const ids: string[] = [];

    const collectIds = (tasks: Task[]) => {
      for (const task of tasks) {
        ids.push(task.id);
        if (this.expandedTasks.has(task.id)) {
          collectIds(task.children);
        }
      }
    };

    // Collect from all expanded projects
    const filteredProjects = this.getFilteredProjects();
    for (const project of filteredProjects) {
      if (this.expandedProjects.has(project.projectPath)) {
        collectIds(project.tasks);
      }
    }

    return ids;
  }

  private navigateTasks(direction: number): void {
    const visibleIds = this.getVisibleTaskIds();

    if (visibleIds.length === 0) {
      this.selectedTaskId = null;
      this.render();
      return;
    }

    if (!this.selectedTaskId) {
      // Select first or last task depending on direction
      this.selectedTaskId = direction > 0 ? visibleIds[0] : visibleIds[visibleIds.length - 1];
    } else {
      const currentIndex = visibleIds.indexOf(this.selectedTaskId);
      if (currentIndex === -1) {
        // Selected task not visible, select first
        this.selectedTaskId = visibleIds[0];
      } else {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < visibleIds.length) {
          this.selectedTaskId = visibleIds[newIndex];
        }
      }
    }

    this.render();

    // Scroll selected task into view
    this.scrollToSelectedTask();
  }

  private scrollToSelectedTask(): void {
    if (!this.selectedTaskId) return;

    const taskElement = this.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  private startEditing(taskId: string, cursorPosition?: number): void {
    this.editingTaskId = taskId;
    this.editCursorPosition = cursorPosition ?? null;
    this.render();

    // Focus the input and position cursor
    requestAnimationFrame(() => {
      const input = this.querySelector('.task-edit-input') as HTMLInputElement;
      if (input) {
        input.focus();
        if (this.editCursorPosition !== null) {
          // Clamp cursor position to valid range
          const pos = Math.min(this.editCursorPosition, input.value.length);
          input.setSelectionRange(pos, pos);
        }
      }
    });
  }

  private cancelEditing(): void {
    this.editingTaskId = null;
    this.render();
  }

  private async saveEditing(): Promise<void> {
    if (!this.editingTaskId) return;

    const input = this.querySelector('.task-edit-input') as HTMLInputElement;
    if (!input) return;

    const newText = input.value.trim();
    if (!newText) {
      this.cancelEditing();
      return;
    }

    // Find project path
    const taskElement = this.querySelector(`[data-task-id="${this.editingTaskId}"]`);
    const projectPath = taskElement?.getAttribute('data-project-path');

    if (!projectPath) {
      console.error('Could not find project path for task');
      this.cancelEditing();
      return;
    }

    try {
      const updatedProject = await this.api.updateTask(projectPath, this.editingTaskId, { text: newText });

      // Update local data
      if (this.allTasksData) {
        const projectIndex = this.allTasksData.projects.findIndex(p => p.projectPath === projectPath);
        if (projectIndex !== -1) {
          this.allTasksData.projects[projectIndex] = updatedProject;
        }
      }

      this.editingTaskId = null;
      this.render();
    } catch (error) {
      console.error('Failed to update task:', error);
      this.cancelEditing();
    }
  }

  private async addSiblingTask(): Promise<void> {
    if (!this.selectedTaskId || !this.allTasksData) return;

    // Find the task and its project
    let projectPath: string | undefined;
    let task: Task | null = null;

    for (const project of this.allTasksData.projects) {
      const found = this.findTaskInTree(project.tasks, this.selectedTaskId);
      if (found) {
        projectPath = project.projectPath;
        task = found;
        break;
      }
    }

    if (!projectPath || !task) return;

    try {
      const result = await this.api.addTask({
        text: '- New task',
        afterTaskId: this.selectedTaskId,
        projectPath
      });

      // Update local data
      const projectIndex = this.allTasksData.projects.findIndex(p => p.projectPath === projectPath);
      if (projectIndex !== -1) {
        this.allTasksData.projects[projectIndex] = result.projectTasks;
      }

      // Select and edit the new task
      this.selectedTaskId = result.newTaskId;
      this.editingTaskId = result.newTaskId;
      this.render();

      // Focus the input
      requestAnimationFrame(() => {
        const input = this.querySelector('.task-edit-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      });
    } catch (error) {
      console.error('Failed to add sibling task:', error);
    }
  }

  private async addChildTask(): Promise<void> {
    if (!this.selectedTaskId || !this.allTasksData) return;

    // Find the task and its project
    let projectPath: string | undefined;

    for (const project of this.allTasksData.projects) {
      const found = this.findTaskInTree(project.tasks, this.selectedTaskId);
      if (found) {
        projectPath = project.projectPath;
        break;
      }
    }

    if (!projectPath) return;

    try {
      const result = await this.api.addTask({
        text: '- New subtask',
        parentId: this.selectedTaskId,
        projectPath
      });

      // Update local data
      const projectIndex = this.allTasksData.projects.findIndex(p => p.projectPath === projectPath);
      if (projectIndex !== -1) {
        this.allTasksData.projects[projectIndex] = result.projectTasks;
      }

      // Expand the parent task and select/edit the new task
      this.expandedTasks.add(this.selectedTaskId);
      this.selectedTaskId = result.newTaskId;
      this.editingTaskId = result.newTaskId;
      this.render();

      // Focus the input
      requestAnimationFrame(() => {
        const input = this.querySelector('.task-edit-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      });
    } catch (error) {
      console.error('Failed to add child task:', error);
    }
  }

  private openDatePicker(taskId: string, type: 'defer' | 'due' | 'scheduled'): void {
    this.datePickerTaskId = taskId;
    this.datePickerType = type;
    this.render();

    // Position the popover near the clicked tag
    requestAnimationFrame(() => {
      const tagButton = this.querySelector(`[data-date-tag="${type}"][data-task-id="${taskId}"]`);
      const panel = this.querySelector('#date-picker-panel') as HTMLElement;

      if (tagButton && panel) {
        const rect = tagButton.getBoundingClientRect();
        panel.style.top = `${rect.bottom + 8}px`;
        panel.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
      }

      // Focus the date input
      const dateInput = this.querySelector('#date-picker-input') as HTMLInputElement;
      if (dateInput) {
        dateInput.focus();
      }
    });
  }

  private closeDatePicker(): void {
    this.datePickerTaskId = null;
    this.datePickerType = null;
    this.render();
  }

  private async saveDatePicker(clear: boolean = false): Promise<void> {
    if (!this.datePickerTaskId || !this.datePickerType || !this.allTasksData) return;

    // Find project path
    let projectPath: string | undefined;
    for (const project of this.allTasksData.projects) {
      if (this.findTaskInTree(project.tasks, this.datePickerTaskId)) {
        projectPath = project.projectPath;
        break;
      }
    }

    if (!projectPath) return;

    let dateValue: Date | null = null;
    if (!clear) {
      const input = this.querySelector('#date-picker-input') as HTMLInputElement;
      if (input && input.value) {
        const parts = input.value.split('-');
        dateValue = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }

    try {
      const updates = { [this.datePickerType]: dateValue };
      const updatedProject = await this.api.updateTask(projectPath, this.datePickerTaskId, updates);

      // Update local data
      const projectIndex = this.allTasksData.projects.findIndex(p => p.projectPath === projectPath);
      if (projectIndex !== -1) {
        this.allTasksData.projects[projectIndex] = updatedProject;
      }

      this.closeDatePicker();
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
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
          this.selectedTaskId = null; // Clear selection on filter change
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

    // Task items - click to select (no clone-and-replace needed, just add listener)
    const taskItems = this.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      (item as HTMLElement).addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const taskId = target.dataset.taskId;

        // Don't select if clicking on checkbox, toggle, or input
        const clickTarget = e.target as HTMLElement;
        if (clickTarget.closest('.task-checkbox') ||
            clickTarget.closest('.task-toggle') ||
            clickTarget.closest('.task-edit-input') ||
            clickTarget.closest('.date-tag') ||
            clickTarget.closest('.add-date-btn')) {
          return;
        }

        // Don't select if click is from a nested child task item
        const clickedTaskItem = clickTarget.closest('.task-item');
        if (clickedTaskItem !== target) {
          return;
        }

        if (taskId) {
          this.selectedTaskId = taskId;
          this.render();
        }
      });
    });

    // Task toggles (for expanding/collapsing hierarchy) - after task items
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

    // Task text - double click to edit
    const taskTexts = this.querySelectorAll('.task-text');
    taskTexts.forEach(textEl => {
      const newTextEl = textEl.cloneNode(true);
      textEl.replaceWith(newTextEl);
      (newTextEl as HTMLElement).addEventListener('dblclick', (e: MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const taskId = target.dataset.taskText;
        if (taskId) {
          // Calculate cursor position based on click location
          let cursorPos: number | undefined;

          // Get the text node
          const textNode = target.firstChild;
          const text = target.textContent || '';

          if (textNode && textNode.nodeType === Node.TEXT_NODE && text.length > 0) {
            // Try caretRangeFromPoint
            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (range) {
              // Check if the range is within our target element
              if (range.startContainer === textNode || target.contains(range.startContainer)) {
                cursorPos = range.startOffset;
              }
            }

            // Fallback: binary search to find closest character position
            if (cursorPos === undefined || cursorPos < 0) {
              const rect = target.getBoundingClientRect();
              const clickX = e.clientX - rect.left;

              // Binary search for the closest position
              let left = 0;
              let right = text.length;
              let bestPos = 0;
              let bestDistance = Infinity;

              while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (mid > text.length) break;

                try {
                  const testRange = document.createRange();
                  testRange.setStart(textNode, mid);
                  testRange.setEnd(textNode, mid);
                  const charRect = testRange.getBoundingClientRect();
                  const distance = Math.abs(charRect.left - clickX);

                  if (distance < bestDistance) {
                    bestDistance = distance;
                    bestPos = mid;
                  }

                  if (charRect.left < clickX) {
                    left = mid + 1;
                  } else {
                    right = mid - 1;
                  }
                } catch {
                  break;
                }
              }

              cursorPos = Math.max(0, Math.min(bestPos, text.length));
            }
          }

          this.startEditing(taskId, cursorPos);
        }
      });
    });

    // Task edit input - blur to save
    const editInputs = this.querySelectorAll('.task-edit-input');
    editInputs.forEach(input => {
      (input as HTMLElement).addEventListener('blur', () => {
        this.saveEditing();
      });
    });

    // Date tags - click to open date picker
    const dateTags = this.querySelectorAll('.date-tag');
    dateTags.forEach(tag => {
      const newTag = tag.cloneNode(true);
      tag.replaceWith(newTag);
      (newTag as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const taskId = target.dataset.taskId;
        const type = target.dataset.dateTag as 'defer' | 'due' | 'scheduled';
        if (taskId && type) {
          this.openDatePicker(taskId, type);
        }
      });
    });

    // Add date buttons
    const addDateBtns = this.querySelectorAll('.add-date-btn');
    addDateBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const taskId = target.dataset.taskId;
        const type = target.dataset.addDate as 'defer' | 'due' | 'scheduled';
        if (taskId && type) {
          this.openDatePicker(taskId, type);
        }
      });
    });

    // Date picker overlay - click to close
    const datePickerOverlay = this.querySelector('#date-picker-overlay');
    if (datePickerOverlay) {
      (datePickerOverlay as HTMLElement).addEventListener('click', (e) => {
        if (e.target === datePickerOverlay) {
          this.closeDatePicker();
        }
      });
    }

    // Date picker clear button
    const datePickerClear = this.querySelector('#date-picker-clear');
    if (datePickerClear) {
      const newBtn = datePickerClear.cloneNode(true);
      datePickerClear.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => {
        this.saveDatePicker(true);
      });
    }

    // Date picker save button
    const datePickerSave = this.querySelector('#date-picker-save');
    if (datePickerSave) {
      const newBtn = datePickerSave.cloneNode(true);
      datePickerSave.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => {
        this.saveDatePicker(false);
      });
    }

    // Date picker input - Enter to save
    const datePickerInput = this.querySelector('#date-picker-input');
    if (datePickerInput) {
      (datePickerInput as HTMLElement).addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveDatePicker(false);
        }
      });
    }
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
