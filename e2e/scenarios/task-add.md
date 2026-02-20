# Task Add E2E Test

## Goal

Verify that users can add new tasks (sibling and child) to existing tasks using keyboard shortcuts and edit them inline.

## Prerequisites

### Test Data Requirements

The following test data must exist in `test-user-data/Projects/` before running the test:

#### Project 1 (`Project 1/tasks.txt`)

```
- Settle down the stage props
	- Settle down the curtain
	- Settle down the signs
- Practice and rehearsal
```

**Purpose**: Provides existing tasks for testing sibling and child task addition.

#### Project 2 (`Project 2/tasks.txt`)

```
- Build the application
	- Add user authentication
	- Implement dashboard
- Write documentation
```

**Purpose**: Ensures tasks are added to the correct project containing the selected task, not always to Project 1.

## Acceptance Criteria

### Selecting a Task
- [ ] Clicking on a task selects it (shows blue ring highlight)
- [ ] Selected task is visually indicated

### Adding a Sibling Task
- [ ] Pressing Cmd+N (Mac) or Ctrl+N (Windows/Linux) with a task selected creates a new sibling task
- [ ] New task appears directly after the selected task
- [ ] New task text field defaults to "New task"
- [ ] New task input is automatically focused and text is selected
- [ ] Typing new text and pressing Enter saves the task
- [ ] Task appears with the new text after saving

### Adding a Child Task
- [ ] Pressing Shift+Cmd+N (Mac) or Shift+Ctrl+N (Windows/Linux) with a task selected creates a new child task
- [ ] New child task appears as a subtask (indented) of the selected task
- [ ] New child task text field defaults to "New subtask"
- [ ] New child task input is automatically focused and text is selected
- [ ] Parent task expands to show the new child
- [ ] Typing new text and pressing Enter saves the child task

### Canceling Task Addition
- [ ] Pressing Escape while editing cancels the edit
- [ ] Task reverts to the new task placeholder text

### Multi-Project Task Addition
- [ ] Adding a task in Project 2 creates the task in Project 2 (not Project 1)
- [ ] New tasks appear under the correct project section
