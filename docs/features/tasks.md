# Tasks Feature

## Overview
The Tasks feature provides a comprehensive task management system integrated into Turbo Carnival, using the TaskPaper format for storing and organizing hierarchical tasks across projects.

## Features
- **TaskPaper Format**: Uses plain text with tags for cross-platform compatibility
- **Hierarchical Tasks**: Support for nested tasks with unlimited depth
- **Multi-Project Support**: View and manage tasks across all projects
- **Date Management**: Support for defer, due, and scheduled dates
- **Smart Filtering**: Filter by all, available, today, or empty projects
- **Keyboard Navigation**: Full keyboard support for rapid task management
- **Auto Done Date**: Automatically records completion date with `@done(YYYY-MM-DD)`
- **Parent/Child Completion**: Marking parent complete marks all children; unmarking child unmarks parents
- **Dark Mode**: Full theme support synced with app settings

## Usage

### Opening Tasks Dialog
Click the "Tasks" button in the header or use the keyboard shortcut to open the tasks dialog.

### Task Format
Tasks use the TaskPaper format:
```
- Task text @done @defer(2024-01-15) @due(2024-01-20) @scheduled(2024-01-18)
	- Child task @done(2024-01-16)
		- Nested child task
```

### Supported Tags
- `@done` - Marks task as complete
- `@done(YYYY-MM-DD)` - Marks complete with specific date (auto-set when completing)
- `@defer(YYYY-MM-DD)` - Hides task until the specified date
- `@due(YYYY-MM-DD)` - Sets a due date
- `@scheduled(YYYY-MM-DD)` - Sets a scheduled date

### Date Formats
- **Absolute**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Relative**: `today`, `tomorrow`, `+7d` (7 days from now)

### Creating Tasks
1. Click "+" button in the sidebar or press `Cmd+N` (macOS) / `Ctrl+N` (Windows/Linux)
2. Type the task text
3. Press Enter to save

### Creating Child Tasks
1. Select a parent task
2. Press `Shift+Cmd+]` (macOS) or `Shift+Ctrl+]` (Windows/Linux)
3. Type the child task text

### Editing Tasks
1. Double-click on a task text
2. Edit the text
3. Press Enter to save or Escape to cancel

### Toggling Completion
- Click the checkbox to toggle completion
- Press `Cmd+Enter` (macOS) or `Ctrl+Enter` (Windows/Linux)
- When marking complete, `@done(date)` is automatically added with today's date
- When unmarking, the done date is cleared

### Setting Dates
1. Click the calendar icon on a task
2. Select the date type (Defer, Due, Scheduled)
3. Choose the date from the picker

### Keyboard Shortcuts
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New sibling task | `Cmd+N` | `Ctrl+N` |
| New child task | `Shift+Cmd+]` | `Shift+Ctrl+]` |
| Toggle completion | `Cmd+Enter` | `Ctrl+Enter` |
| Navigate up | `↑` | `↑` |
| Navigate down | `↓` | `↓` |
| Expand/Collapse | `←/→` | `←/→` |
| Close dialog | `Escape` | `Escape` |

## Filters

### All
Shows all tasks from all projects.

### Available
Shows tasks that are not deferred to a future date. Completed tasks and tasks with a future defer date are hidden.

### Today
Shows tasks that:
- Are due today
- Are scheduled for today
- Have a child scheduled for today or earlier (parent shown for context)

### Empty
Shows projects that don't have a `tasks.txt` file, allowing quick setup of new project tasks.

## Architecture

### Main Process
- **`src/tasks/main/task-management.ts`**: IPC handlers and core operations
  - `getAllTasks()` - Retrieves tasks from all projects
  - `getProjectTasks()` - Gets tasks for a specific project
  - `saveTasks()` - Saves task content to `tasks.txt`
  - `toggleTaskDone()` - Toggles completion with parent/child handling
  - `updateTask()` - Updates task properties
  - `addTask()` - Adds new tasks

### Utilities
- **`src/tasks/utils/taskpaper-parser.ts`**: TaskPaper format handling
  - `parseTaskPaper()` - Parses text into Task objects
  - `serializeTaskPaper()` - Converts Tasks back to text
  - `parseDate()` - Parses various date formats
  - `toggleTaskDoneInTree()` - Handles parent/child completion logic
  - `isTaskAvailable()` - Checks if task is available (defer check)
  - `isTaskToday()` - Checks if task is due/scheduled for today
  - `countIncompleteTasks()` - Counts remaining tasks

### Preload
- **`src/tasks/preload/index.ts`**: IPC bridge for task operations

### Renderer API
- **`src/tasks/api/index.ts`**: Type-safe API wrapper

### UI Components
- **`src/tasks/components/tasks-dialog.ts`**: Main dialog Web Component with:
  - Three-panel layout (project sidebar, task tree, keyboard shortcuts)
  - Inline task editing
  - Date picker integration
  - Filter controls
  - Keyboard navigation
  - Expand/collapse state persistence

### Types
- **`src/tasks/types/index.ts`**: Type definitions
  - `Task` - Individual task with all properties
  - `TaskFile` - Project task file metadata
  - `TaskFilter` - Filter type enum
  - `ProjectTasks` - Project with tasks
  - `AllTasksData` - Combined data structure
  - `TaskUpdate` - Partial update payload
  - `NewTask` - New task creation payload

### IPC Channels
- `tasks:getAllTasks` - Get tasks from all projects
- `tasks:getProjectTasks` - Get tasks for a specific project
- `tasks:saveTasks` - Save tasks to file
- `tasks:toggleTaskDone` - Toggle completion status
- `tasks:updateTask` - Update task properties
- `tasks:addTask` - Add a new task

## File Storage
- **Location**: `{projectFolder}/tasks.txt`
- **Format**: TaskPaper (plain text with tabs for indentation)
- **Encoding**: UTF-8
- **One file per project**

## Completion Behavior

### Marking Complete
1. Task is marked with `@done`
2. Today's date is automatically added: `@done(YYYY-MM-DD)`
3. All child tasks are marked complete recursively
4. Each child gets its own done date

### Unmarking Complete
1. `@done` and done date are removed
2. All parent tasks are unmarked (to ensure incomplete parent shows incomplete child)
3. Child task completion is preserved

## Visual Indicators

### Task Status
- Empty checkbox: Incomplete
- Checked checkbox: Complete
- Partial indicator: Has incomplete children

### Date Tags
- **Purple**: Done date (`@done(2024-01-15)`)
- **Red**: Due date (highlights if due within 7 days)
- **Green**: Scheduled date
- **Gray**: Defer date

### Project Sidebar
- Shows incomplete task count per project
- Expandable/collapsible project list
- Visual indication of selected project

## Edge Cases Handled

### Missing tasks.txt
- Projects without `tasks.txt` appear in "Empty" filter
- Can create tasks for any project

### Invalid Date Formats
- Unrecognized date formats are ignored
- Original text is preserved

### Empty Projects
- Empty projects show helpful message
- Can add first task with keyboard shortcut

### Orphaned Children
- Parser handles inconsistent indentation
- Tasks are associated with nearest valid parent

### Large Task Lists
- Efficient tree traversal algorithms
- Lazy rendering for performance

## Performance Considerations

### File Loading
- Tasks loaded on dialog open
- Cached in memory during editing
- Saved on every change

### Tree Operations
- O(n) for most operations where n = total tasks
- Efficient parent/child traversal
- Minimal re-rendering on updates

### UI Rendering
- Hierarchical rendering with expand/collapse
- State preserved during session
- Smooth scrolling for long lists
