# Task Edit E2E Test

## Goal

Verify that users can edit existing tasks including task name, defer date, due date, and scheduled date.

## Prerequisites

### Test Data Requirements

The following test data must exist in `test-user-data/Projects/` before running the test:

#### Project 1 (`Project 1/tasks.txt`)

```
- Settle down the stage props
	- Settle down the curtain
	- Settle down the signs
- Practice and rehearsal
- Buy equipment @due(2026-03-15) @scheduled(2026-03-10)
- Review proposal @defer(2026-03-20)
```

**Purpose**: Provides tasks with and without existing dates for testing various edit scenarios.

#### Project 2 (`Project 2/tasks.txt`)

```
- Build the application
	- Add user authentication
	- Implement dashboard @due(2026-04-01)
- Write documentation @scheduled(2026-03-25)
```

**Purpose**: Ensures edits are applied to the correct project.

## Acceptance Criteria

### Selecting a Task for Editing
- [ ] Clicking on a task selects it (shows blue ring highlight)
- [ ] Selected task is visually indicated with blue ring

### Editing Task Name (via Enter key)
- [ ] Pressing Enter with a task selected enters edit mode
- [ ] Task text becomes an editable input field
- [ ] Input field is automatically focused
- [ ] Current task text is displayed in the input
- [ ] Typing new text and pressing Enter saves the change
- [ ] Task displays the new text after saving
- [ ] Pressing Escape cancels the edit and reverts to original text

### Editing Task Name (via double-click)
- [ ] Double-clicking on task text enters edit mode
- [ ] Cursor is positioned near the click location
- [ ] Typing new text and pressing Enter saves the change

### Editing Defer Date
- [ ] Clicking on existing "defer:YYYY-MM-DD" tag opens date picker popover
- [ ] Clicking "+defer" button on a task without defer date opens date picker
- [ ] Date picker shows the current defer date (if exists)
- [ ] Date picker input allows selecting a new date
- [ ] Clicking "Save" updates the task's defer date
- [ ] Updated defer date is displayed as "defer:YYYY-MM-DD" on the task
- [ ] Clicking "Clear" removes the defer date from the task
- [ ] Clicking outside the popover cancels the date picker
- [ ] Pressing Escape closes the date picker without saving

### Editing Due Date
- [ ] Clicking on existing "due:YYYY-MM-DD" tag opens date picker popover
- [ ] Clicking "+due" button on a task without due date opens date picker
- [ ] Date picker shows the current due date (if exists)
- [ ] Due date tag is displayed in red color
- [ ] Date picker input allows selecting a new date
- [ ] Clicking "Save" updates the task's due date
- [ ] Updated due date is displayed as "due:YYYY-MM-DD" on the task
- [ ] Clicking "Clear" removes the due date from the task

### Editing Scheduled Date
- [ ] Clicking on existing "scheduled:YYYY-MM-DD" tag opens date picker popover
- [ ] Clicking "+scheduled" button on a task without scheduled date opens date picker
- [ ] Date picker shows the current scheduled date (if exists)
- [ ] Scheduled date tag is displayed in green color
- [ ] Date picker input allows selecting a new date
- [ ] Clicking "Save" updates the task's scheduled date
- [ ] Updated scheduled date is displayed as "scheduled:YYYY-MM-DD" on the task
- [ ] Clicking "Clear" removes the scheduled date from the task

### Adding Multiple Date Types
- [ ] A task can have defer, due, and scheduled dates simultaneously
- [ ] "+defer", "+due", "+scheduled" buttons appear on hover for missing date types
- [ ] Clicking each button opens the respective date picker
- [ ] All date tags are displayed on the task after adding

### Multi-Project Edit Verification
- [ ] Editing a task in Project 2 only affects that task in Project 2
- [ ] Changes are persisted and visible after closing and reopening the dialog
