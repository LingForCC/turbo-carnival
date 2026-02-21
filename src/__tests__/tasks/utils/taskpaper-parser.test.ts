/**
 * Unit tests for TaskPaper Format Parser
 */
import {
  parseTaskPaper,
  parseTaskTags,
  parseDate,
  formatDate,
  serializeTaskPaper,
  findTaskById,
  toggleTaskDoneInTree,
  countAllTasks,
  countIncompleteTasks,
  countDoneTasks,
  isTaskAvailable,
  isTaskToday,
  hasTaskOrDescendantScheduledTodayOrEarlier,
  isTaskDueWithinDays,
  findTaskAndParent,
  updateTaskInTree,
  addTaskToTree,
} from '../../../tasks/utils/taskpaper-parser';
import type { Task } from '../../../tasks/types';

// Helper to create a date at midnight
function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// Helper to get today's date at midnight
function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

describe('taskpaper-parser', () => {
  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const result = parseDate('2024-03-15');
      expect(result).toEqual(createDate(2024, 3, 15));
    });

    it('should parse "today"', () => {
      const result = parseDate('today');
      const today = getToday();
      expect(result).toEqual(today);
    });

    it('should parse "tomorrow"', () => {
      const result = parseDate('tomorrow');
      const tomorrow = getToday();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result).toEqual(tomorrow);
    });

    it('should parse +Nd format (N days from now)', () => {
      const result = parseDate('+7d');
      const expected = getToday();
      expected.setDate(expected.getDate() + 7);
      expect(result).toEqual(expected);
    });

    it('should parse +N format without "d" suffix', () => {
      const result = parseDate('+3');
      const expected = getToday();
      expected.setDate(expected.getDate() + 3);
      expect(result).toEqual(expected);
    });

    it('should handle case-insensitive input', () => {
      const result = parseDate('TODAY');
      const today = getToday();
      expect(result).toEqual(today);
    });

    it('should handle whitespace in input', () => {
      const result = parseDate('  2024-03-15  ');
      expect(result).toEqual(createDate(2024, 3, 15));
    });

    it('should return undefined for invalid date format', () => {
      expect(parseDate('invalid')).toBeUndefined();
      expect(parseDate('2024/03/15')).toBeUndefined();
      expect(parseDate('03-15-2024')).toBeUndefined();
    });
  });

  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = createDate(2024, 3, 15);
      expect(formatDate(date)).toBe('2024-03-15');
    });

    it('should pad single digit month and day', () => {
      const date = createDate(2024, 1, 5);
      expect(formatDate(date)).toBe('2024-01-05');
    });
  });

  describe('parseTaskTags', () => {
    it('should parse plain task text', () => {
      const result = parseTaskTags('- Buy groceries');
      expect(result.text).toBe('- Buy groceries');
      expect(result.done).toBe(false);
      expect(result.defer).toBeUndefined();
      expect(result.due).toBeUndefined();
      expect(result.scheduled).toBeUndefined();
    });

    it('should parse @done tag without date', () => {
      const result = parseTaskTags('- Task @done');
      expect(result.text).toBe('- Task');
      expect(result.done).toBe(true);
      expect(result.doneDate).toBeUndefined();
    });

    it('should parse @done(YYYY-MM-DD) tag', () => {
      const result = parseTaskTags('- Task @done(2024-03-15)');
      expect(result.text).toBe('- Task');
      expect(result.done).toBe(true);
      expect(result.doneDate).toEqual(createDate(2024, 3, 15));
    });

    it('should parse @defer(date) tag', () => {
      const result = parseTaskTags('- Task @defer(2024-03-15)');
      expect(result.text).toBe('- Task');
      expect(result.defer).toEqual(createDate(2024, 3, 15));
    });

    it('should parse @due(date) tag', () => {
      const result = parseTaskTags('- Task @due(2024-03-15)');
      expect(result.text).toBe('- Task');
      expect(result.due).toEqual(createDate(2024, 3, 15));
    });

    it('should parse @scheduled(date) tag', () => {
      const result = parseTaskTags('- Task @scheduled(2024-03-15)');
      expect(result.text).toBe('- Task');
      expect(result.scheduled).toEqual(createDate(2024, 3, 15));
    });

    it('should parse multiple tags', () => {
      const result = parseTaskTags('- Task @defer(2024-03-01) @due(2024-03-15) @scheduled(2024-03-10)');
      expect(result.text).toBe('- Task');
      expect(result.defer).toEqual(createDate(2024, 3, 1));
      expect(result.due).toEqual(createDate(2024, 3, 15));
      expect(result.scheduled).toEqual(createDate(2024, 3, 10));
    });

    it('should parse all tags including done with date', () => {
      const result = parseTaskTags('- Task @done(2024-03-20) @defer(2024-03-01) @due(2024-03-15)');
      expect(result.text).toBe('- Task');
      expect(result.done).toBe(true);
      expect(result.doneDate).toEqual(createDate(2024, 3, 20));
      expect(result.defer).toEqual(createDate(2024, 3, 1));
      expect(result.due).toEqual(createDate(2024, 3, 15));
    });

    it('should add dash prefix if missing', () => {
      const result = parseTaskTags('Task without dash');
      expect(result.text).toBe('- Task without dash');
    });
  });

  describe('parseTaskPaper', () => {
    it('should parse simple flat task list', () => {
      const content = `- Task 1\n- Task 2\n- Task 3`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('- Task 1');
      expect(result[0].indent).toBe(0);
      expect(result[1].text).toBe('- Task 2');
      expect(result[2].text).toBe('- Task 3');
    });

    it('should parse hierarchical tasks with tabs', () => {
      const content = `- Parent task\n\t- Child task 1\n\t- Child task 2`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('- Parent task');
      expect(result[0].indent).toBe(0);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].text).toBe('- Child task 1');
      expect(result[0].children[0].indent).toBe(1);
      expect(result[0].children[1].text).toBe('- Child task 2');
    });

    it('should parse deeply nested tasks', () => {
      const content = `- Level 0\n\t- Level 1\n\t\t- Level 2\n\t\t\t- Level 3`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result).toHaveLength(1);
      expect(result[0].children[0].children[0].children[0].text).toBe('- Level 3');
      expect(result[0].children[0].children[0].children[0].indent).toBe(3);
    });

    it('should skip empty lines', () => {
      const content = `- Task 1\n\n\n- Task 2`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result).toHaveLength(2);
    });

    it('should parse tasks with tags', () => {
      const content = `- Task @done(2024-03-15) @due(2024-03-20)`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result[0].done).toBe(true);
      expect(result[0].doneDate).toEqual(createDate(2024, 3, 15));
      expect(result[0].due).toEqual(createDate(2024, 3, 20));
    });

    it('should assign unique IDs', () => {
      const content = `- Task 1\n- Task 2`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result[0].id).toBe('/project-1');
      expect(result[1].id).toBe('/project-2');
    });

    it('should set correct line numbers', () => {
      const content = `- Task 1\n\n- Task 2`;
      const result = parseTaskPaper(content, '/project', 'Test Project');

      expect(result[0].lineNumber).toBe(1);
      expect(result[1].lineNumber).toBe(3);
    });

    it('should set project info', () => {
      const content = `- Task`;
      const result = parseTaskPaper(content, '/my/project', 'My Project');

      expect(result[0].projectPath).toBe('/my/project');
      expect(result[0].projectName).toBe('My Project');
    });
  });

  describe('serializeTaskPaper', () => {
    it('should serialize simple flat tasks', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Task 1',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 1,
        },
        {
          id: '2',
          text: '- Task 2',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 2,
        },
      ];

      const result = serializeTaskPaper(tasks);
      expect(result).toBe('- Task 1\n- Task 2');
    });

    it('should serialize hierarchical tasks with tabs', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [
            {
              id: '2',
              text: '- Child',
              projectPath: '/project',
              projectName: 'Test',
              indent: 1,
              done: false,
              children: [],
              lineNumber: 2,
            },
          ],
          lineNumber: 1,
        },
      ];

      const result = serializeTaskPaper(tasks);
      expect(result).toBe('- Parent\n\t- Child');
    });

    it('should serialize @done tag without date', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: true,
          children: [],
          lineNumber: 1,
        },
      ];

      const result = serializeTaskPaper(tasks);
      expect(result).toBe('- Task @done');
    });

    it('should serialize @done(date) tag', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: true,
          doneDate: createDate(2024, 3, 15),
          children: [],
          lineNumber: 1,
        },
      ];

      const result = serializeTaskPaper(tasks);
      expect(result).toBe('- Task @done(2024-03-15)');
    });

    it('should serialize all date tags', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          defer: createDate(2024, 3, 1),
          due: createDate(2024, 3, 15),
          scheduled: createDate(2024, 3, 10),
          children: [],
          lineNumber: 1,
        },
      ];

      const result = serializeTaskPaper(tasks);
      expect(result).toBe('- Task @defer(2024-03-01) @due(2024-03-15) @scheduled(2024-03-10)');
    });

    it('should roundtrip parse and serialize', () => {
      const content = `- Parent\n\t- Child @done(2024-03-15)\n\t\t- Grandchild @due(2024-03-20)`;
      const parsed = parseTaskPaper(content, '/project', 'Test');
      const serialized = serializeTaskPaper(parsed);

      expect(serialized).toBe(content);
    });
  });

  describe('findTaskById', () => {
    it('should find top-level task', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          text: '- Task 1',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 1,
        },
        {
          id: 'task-2',
          text: '- Task 2',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 2,
        },
      ];

      const result = findTaskById(tasks, 'task-2');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('- Task 2');
    });

    it('should find nested task', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          text: '- Parent',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [
            {
              id: 'task-2',
              text: '- Child',
              projectPath: '/project',
              projectName: 'Test',
              indent: 1,
              done: false,
              children: [],
              lineNumber: 2,
            },
          ],
          lineNumber: 1,
        },
      ];

      const result = findTaskById(tasks, 'task-2');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('- Child');
    });

    it('should return null for non-existent task', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 1,
        },
      ];

      const result = findTaskById(tasks, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('toggleTaskDoneInTree', () => {
    it('should toggle task from not done to done', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 1,
        },
      ];

      const result = toggleTaskDoneInTree(tasks, 'task-1');
      expect(result).toBe(true);
      expect(tasks[0].done).toBe(true);
      expect(tasks[0].doneDate).toEqual(getToday());
    });

    it('should toggle task from done to not done', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          text: '- Task',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: true,
          doneDate: createDate(2024, 3, 15),
          children: [],
          lineNumber: 1,
        },
      ];

      const result = toggleTaskDoneInTree(tasks, 'task-1');
      expect(result).toBe(true);
      expect(tasks[0].done).toBe(false);
      expect(tasks[0].doneDate).toBeUndefined();
    });

    it('should mark all children done when parent is marked done', () => {
      const tasks: Task[] = [
        {
          id: 'parent',
          text: '- Parent',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [
            {
              id: 'child-1',
              text: '- Child 1',
              projectPath: '/project',
              projectName: 'Test',
              indent: 1,
              done: false,
              children: [],
              lineNumber: 2,
            },
            {
              id: 'child-2',
              text: '- Child 2',
              projectPath: '/project',
              projectName: 'Test',
              indent: 1,
              done: false,
              children: [
                {
                  id: 'grandchild',
                  text: '- Grandchild',
                  projectPath: '/project',
                  projectName: 'Test',
                  indent: 2,
                  done: false,
                  children: [],
                  lineNumber: 4,
                },
              ],
              lineNumber: 3,
            },
          ],
          lineNumber: 1,
        },
      ];

      toggleTaskDoneInTree(tasks, 'parent');

      expect(tasks[0].done).toBe(true);
      expect(tasks[0].children[0].done).toBe(true);
      expect(tasks[0].children[1].done).toBe(true);
      expect(tasks[0].children[1].children[0].done).toBe(true);
    });

    it('should mark all parents not done when child is marked not done', () => {
      const tasks: Task[] = [
        {
          id: 'parent',
          text: '- Parent',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: true,
          doneDate: createDate(2024, 3, 15),
          children: [
            {
              id: 'child',
              text: '- Child',
              projectPath: '/project',
              projectName: 'Test',
              indent: 1,
              done: true,
              doneDate: createDate(2024, 3, 15),
              children: [],
              lineNumber: 2,
            },
          ],
          lineNumber: 1,
        },
      ];

      toggleTaskDoneInTree(tasks, 'child');

      // Parent done status is cleared but doneDate is not cleared (implementation behavior)
      expect(tasks[0].done).toBe(false);
      // Child done and doneDate are cleared via setTaskAndChildrenDone
      expect(tasks[0].children[0].done).toBe(false);
      expect(tasks[0].children[0].doneDate).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      const tasks: Task[] = [];
      const result = toggleTaskDoneInTree(tasks, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('countAllTasks', () => {
    it('should count flat task list', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task 1', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
        {
          id: '2', text: '- Task 2', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 2,
        },
      ];

      expect(countAllTasks(tasks)).toBe(2);
    });

    it('should count hierarchical tasks', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '',
          projectName: '',
          indent: 0,
          done: false,
          children: [
            {
              id: '2', text: '- Child 1', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 2,
            },
            {
              id: '3', text: '- Child 2', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 3,
            },
          ],
          lineNumber: 1,
        },
      ];

      expect(countAllTasks(tasks)).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(countAllTasks([])).toBe(0);
    });
  });

  describe('countIncompleteTasks', () => {
    it('should count only incomplete tasks', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task 1', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
        {
          id: '2', text: '- Task 2', projectPath: '', projectName: '', indent: 0, done: true, children: [], lineNumber: 2,
        },
        {
          id: '3', text: '- Task 3', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 3,
        },
      ];

      expect(countIncompleteTasks(tasks)).toBe(2);
    });

    it('should count incomplete tasks in hierarchy', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '',
          projectName: '',
          indent: 0,
          done: true,
          children: [
            {
              id: '2', text: '- Child 1', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 2,
            },
            {
              id: '3', text: '- Child 2', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 3,
            },
          ],
          lineNumber: 1,
        },
      ];

      expect(countIncompleteTasks(tasks)).toBe(2);
    });
  });

  describe('countDoneTasks', () => {
    it('should count only done tasks', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task 1', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
        {
          id: '2', text: '- Task 2', projectPath: '', projectName: '', indent: 0, done: true, children: [], lineNumber: 2,
        },
        {
          id: '3', text: '- Task 3', projectPath: '', projectName: '', indent: 0, done: true, children: [], lineNumber: 3,
        },
      ];

      expect(countDoneTasks(tasks)).toBe(2);
    });

    it('should count done tasks in hierarchy', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '',
          projectName: '',
          indent: 0,
          done: true,
          children: [
            {
              id: '2', text: '- Child 1', projectPath: '', projectName: '', indent: 1, done: true, children: [], lineNumber: 2,
            },
            {
              id: '3', text: '- Child 2', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 3,
            },
          ],
          lineNumber: 1,
        },
      ];

      expect(countDoneTasks(tasks)).toBe(2);
    });
  });

  describe('isTaskAvailable', () => {
    it('should return false for done tasks', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: true, children: [], lineNumber: 1,
      };
      expect(isTaskAvailable(task)).toBe(false);
    });

    it('should return true for tasks without defer date', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
      };
      expect(isTaskAvailable(task)).toBe(true);
    });

    it('should return true when defer date is today or in the past', () => {
      const today = getToday();
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, defer: today, children: [], lineNumber: 1,
      };
      expect(isTaskAvailable(task)).toBe(true);
    });

    it('should return false when defer date is in the future', () => {
      const future = getToday();
      future.setDate(future.getDate() + 7);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, defer: future, children: [], lineNumber: 1,
      };
      expect(isTaskAvailable(task)).toBe(false);
    });
  });

  describe('isTaskToday', () => {
    it('should return false for done tasks', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: true, due: getToday(), children: [], lineNumber: 1,
      };
      expect(isTaskToday(task)).toBe(false);
    });

    it('should return true when due date is today', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: getToday(), children: [], lineNumber: 1,
      };
      expect(isTaskToday(task)).toBe(true);
    });

    it('should return true when scheduled date is today', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, scheduled: getToday(), children: [], lineNumber: 1,
      };
      expect(isTaskToday(task)).toBe(true);
    });

    it('should return false when neither due nor scheduled for today', () => {
      const tomorrow = getToday();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: tomorrow, children: [], lineNumber: 1,
      };
      expect(isTaskToday(task)).toBe(false);
    });
  });

  describe('hasTaskOrDescendantScheduledTodayOrEarlier', () => {
    it('should return false for done tasks', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: true, scheduled: getToday(), children: [], lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(false);
    });

    it('should return true when task is scheduled for today', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, scheduled: getToday(), children: [], lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(true);
    });

    it('should return true when task is scheduled in the past', () => {
      const yesterday = getToday();
      yesterday.setDate(yesterday.getDate() - 1);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, scheduled: yesterday, children: [], lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(true);
    });

    it('should return true when task is due today', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: getToday(), children: [], lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(true);
    });

    it('should return true when child is scheduled for today', () => {
      const task: Task = {
        id: '1',
        text: '- Parent',
        projectPath: '',
        projectName: '',
        indent: 0,
        done: false,
        children: [
          {
            id: '2', text: '- Child', projectPath: '', projectName: '', indent: 1, done: false, scheduled: getToday(), children: [], lineNumber: 2,
          },
        ],
        lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(true);
    });

    it('should return false when all dates are in the future', () => {
      const future = getToday();
      future.setDate(future.getDate() + 7);
      const task: Task = {
        id: '1',
        text: '- Parent',
        projectPath: '',
        projectName: '',
        indent: 0,
        done: false,
        scheduled: future,
        children: [
          {
            id: '2', text: '- Child', projectPath: '', projectName: '', indent: 1, done: false, scheduled: future, children: [], lineNumber: 2,
          },
        ],
        lineNumber: 1,
      };
      expect(hasTaskOrDescendantScheduledTodayOrEarlier(task)).toBe(false);
    });
  });

  describe('isTaskDueWithinDays', () => {
    it('should return false for done tasks', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: true, due: getToday(), children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(false);
    });

    it('should return false for tasks without due date', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(false);
    });

    it('should return true when due within specified days', () => {
      const in3Days = getToday();
      in3Days.setDate(in3Days.getDate() + 3);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: in3Days, children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(true);
    });

    it('should return false when due after specified days', () => {
      const in10Days = getToday();
      in10Days.setDate(in10Days.getDate() + 10);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: in10Days, children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(false);
    });

    it('should return true when due today', () => {
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: getToday(), children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(true);
    });

    it('should return false when due in the past', () => {
      const yesterday = getToday();
      yesterday.setDate(yesterday.getDate() - 1);
      const task: Task = {
        id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, due: yesterday, children: [], lineNumber: 1,
      };
      expect(isTaskDueWithinDays(task, 7)).toBe(false);
    });
  });

  describe('findTaskAndParent', () => {
    it('should find top-level task with parent array', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task 1', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
        {
          id: '2', text: '- Task 2', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 2,
        },
      ];

      const result = findTaskAndParent(tasks, '2');
      expect(result).not.toBeNull();
      expect(result?.task.text).toBe('- Task 2');
      expect(result?.parentTasks).toBe(tasks);
      expect(result?.index).toBe(1);
    });

    it('should find nested task with correct parent array', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '',
          projectName: '',
          indent: 0,
          done: false,
          children: [
            {
              id: '2', text: '- Child 1', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 2,
            },
            {
              id: '3', text: '- Child 2', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 3,
            },
          ],
          lineNumber: 1,
        },
      ];

      const result = findTaskAndParent(tasks, '3');
      expect(result).not.toBeNull();
      expect(result?.task.text).toBe('- Child 2');
      expect(result?.parentTasks).toBe(tasks[0].children);
      expect(result?.index).toBe(1);
    });

    it('should return null for non-existent task', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
      ];

      const result = findTaskAndParent(tasks, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateTaskInTree', () => {
    it('should update task text', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Old text', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
      ];

      const result = updateTaskInTree(tasks, '1', { text: 'New text' });
      expect(result).toBe(true);
      expect(tasks[0].text).toBe('- New text');
    });

    it('should preserve dash prefix when updating text', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Old text', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
      ];

      updateTaskInTree(tasks, '1', { text: '- Already has dash' });
      expect(tasks[0].text).toBe('- Already has dash');
    });

    it('should update defer date', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, children: [], lineNumber: 1,
        },
      ];

      const newDate = createDate(2024, 3, 15);
      const result = updateTaskInTree(tasks, '1', { defer: newDate });
      expect(result).toBe(true);
      expect(tasks[0].defer).toEqual(newDate);
    });

    it('should clear defer date with null', () => {
      const tasks: Task[] = [
        {
          id: '1', text: '- Task', projectPath: '', projectName: '', indent: 0, done: false, defer: createDate(2024, 3, 1), children: [], lineNumber: 1,
        },
      ];

      const result = updateTaskInTree(tasks, '1', { defer: null });
      expect(result).toBe(true);
      expect(tasks[0].defer).toBeUndefined();
    });

    it('should update nested task', () => {
      const tasks: Task[] = [
        {
          id: '1',
          text: '- Parent',
          projectPath: '',
          projectName: '',
          indent: 0,
          done: false,
          children: [
            {
              id: '2', text: '- Child', projectPath: '', projectName: '', indent: 1, done: false, children: [], lineNumber: 2,
            },
          ],
          lineNumber: 1,
        },
      ];

      const result = updateTaskInTree(tasks, '2', { text: 'Updated child' });
      expect(result).toBe(true);
      expect(tasks[0].children[0].text).toBe('- Updated child');
    });

    it('should return false for non-existent task', () => {
      const tasks: Task[] = [];
      const result = updateTaskInTree(tasks, 'non-existent', { text: 'New text' });
      expect(result).toBe(false);
    });
  });

  describe('addTaskToTree', () => {
    it('should add top-level task', () => {
      const tasks: Task[] = [];
      const result = addTaskToTree(tasks, { text: 'New task' }, '/project', 'Test');

      expect(result).toBe('/project-1');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe('- New task');
      expect(tasks[0].indent).toBe(0);
    });

    it('should add task with dash prefix preserved', () => {
      const tasks: Task[] = [];
      addTaskToTree(tasks, { text: '- Already has dash' }, '/project', 'Test');

      expect(tasks[0].text).toBe('- Already has dash');
    });

    it('should add child task to parent', () => {
      const tasks: Task[] = [
        {
          id: 'parent-1',
          text: '- Parent',
          projectPath: '/project',
          projectName: 'Test',
          indent: 0,
          done: false,
          children: [],
          lineNumber: 1,
        },
      ];

      const result = addTaskToTree(tasks, { text: 'Child task', parentId: 'parent-1' }, '/project', 'Test');

      expect(result).toBe('/project-2');
      expect(tasks[0].children).toHaveLength(1);
      expect(tasks[0].children[0].text).toBe('- Child task');
      expect(tasks[0].children[0].indent).toBe(1);
    });

    it('should insert task after sibling', () => {
      const tasks: Task[] = [
        {
          id: 'task-1', text: '- Task 1', projectPath: '/project', projectName: 'Test', indent: 0, done: false, children: [], lineNumber: 1,
        },
        {
          id: 'task-2', text: '- Task 2', projectPath: '/project', projectName: 'Test', indent: 0, done: false, children: [], lineNumber: 2,
        },
      ];

      const result = addTaskToTree(tasks, { text: 'New task', afterTaskId: 'task-1' }, '/project', 'Test');

      expect(result).toBe('/project-3');
      expect(tasks).toHaveLength(3);
      expect(tasks[1].text).toBe('- New task');
      expect(tasks[1].indent).toBe(0);
    });

    it('should return null for non-existent parent', () => {
      const tasks: Task[] = [];
      const result = addTaskToTree(tasks, { text: 'Child', parentId: 'non-existent' }, '/project', 'Test');
      expect(result).toBeNull();
    });

    it('should return null for non-existent afterTaskId', () => {
      const tasks: Task[] = [];
      const result = addTaskToTree(tasks, { text: 'Task', afterTaskId: 'non-existent' }, '/project', 'Test');
      expect(result).toBeNull();
    });

    it('should set project info correctly', () => {
      const tasks: Task[] = [];
      addTaskToTree(tasks, { text: 'Task' }, '/my/project', 'My Project');

      expect(tasks[0].projectPath).toBe('/my/project');
      expect(tasks[0].projectName).toBe('My Project');
    });
  });
});
