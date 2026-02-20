# Task Complete E2E Test

## Goal

Verify that users can toggle task completion status, that completion cascades correctly between parent and child tasks, and that the completion date is recorded and displayed.

## Prerequisites

### Test Data Requirements

The following test data must exist in `test-user-data/Projects/` before running the test:

#### Project 1 (`Project 1/tasks.txt`)

```
- Settle down the stage props
	- Settle down the curtain
	- Settle down the signs
- Practice and rehearsal
- Buy equipment
```

**Purpose**: Provides tasks with nested children for testing cascading completion behavior.

#### Project 2 (`Project 2/tasks.txt`)

```
- Build the application
	- Add user authentication
		- Implement login
		- Implement logout
	- Implement dashboard
- Write documentation
```

**Purpose**: Provides deeply nested tasks (3 levels) for testing recursive cascading completion.

## Acceptance Criteria

### Completing a Simple Task
- [ ] Clicking on a task's checkbox toggles its completion status
- [ ] Completed task shows a checked checkbox
- [ ] Completed task has reduced opacity and strikethrough text
- [ ] Clicking the checkbox again uncompletes the task
- [ ] Uncompleted task shows an unchecked checkbox and normal text

### Completion Date Recording
- [ ] When a task is marked complete, a "done:YYYY-MM-DD" tag appears showing today's date
- [ ] The done date tag is displayed in purple/magenta color (read-only indicator)
- [ ] The done date tag is NOT clickable (no date picker popover)
- [ ] When a task is uncompleted, the done date tag disappears
- [ ] The done date persists when closing and reopening the tasks dialog
- [ ] The done date is stored in the tasks.txt file as `@done(YYYY-MM-DD)` format

### Completion Date Cascade with Parent/Child
- [ ] When completing a parent task, all children get the same done date (today)
- [ ] When uncompleting a child task (which also uncompletes parent), done dates are cleared from affected tasks
- [ ] When uncompleting a parent, all children have their done dates cleared

### Completing a Parent Task (Cascade to Children)
- [ ] Clicking a parent task's checkbox marks the parent as complete
- [ ] All child tasks are automatically marked as complete when parent is completed
- [ ] All child tasks show checked checkboxes and strikethrough text
- [ ] Toggling the parent again (to not complete) marks all children as not complete
- [ ] All child tasks show unchecked checkboxes and normal text

### Uncompleting a Child Task (Bubble Up to Parents)
- [ ] First, complete a parent task (which completes all children)
- [ ] Then click a child task's checkbox to mark it as not complete
- [ ] The child task becomes not complete
- [ ] The parent task is automatically marked as not complete
- [ ] Other sibling children remain complete (only the toggled child and parents are affected)

### Deeply Nested Completion Cascade
- [ ] Complete the top-level task "Build the application" in Project 2
- [ ] All nested children at all levels are marked as complete
- [ ] Uncomplete the deeply nested task "Implement login"
- [ ] All ancestor tasks ("Add user authentication" and "Build the application") are marked as not complete
- [ ] Sibling tasks at the same level remain complete

### Multi-Project Completion
- [ ] Completing a task in Project 1 only affects tasks in Project 1
- [ ] Completing a task in Project 2 only affects tasks in Project 2
- [ ] Completion state is persisted and visible after closing and reopening the dialog

### Visual Feedback
- [ ] Completed tasks show visual strikethrough and reduced opacity
- [ ] Checkbox state accurately reflects completion status
- [ ] Changes are immediately visible without needing to refresh
- [ ] Done date is displayed in purple/magenta color to distinguish from editable date tags
