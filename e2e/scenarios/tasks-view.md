# Tasks View E2E Test

## Goal

Verify that users can view and interact with the tasks list from all projects in a unified interface.

## Prerequisites

### Test Data Requirements

The following test data must exist in `test-user-data/Projects/` before running the test:

#### Project 1 (`Project 1/tasks.txt`)

```
- Settle down the stage props
	- Settle down the curtain
		- Place the order
	- Settle down the signs
		- Wait for the story
- Settle down the story
	- Brainstorm the story related to personal development
		- Brainstorm the fifth scene
- Practice and rehearsal
	- Wait for the story @defer(2026-03-18)
```

**Purpose**: Tests hierarchical task structure and deferred tasks.

#### Project 2 (`Project 2/tasks.txt`)

```
- Build the application
	- Add an empty record for user hash when submit button is clicked
	- Add the style: positive to the submit button 
	- Implement the party voting result page 
		- Think about how to make the car racing 
- Conduct performance test 
```

**Purpose**: Tests tasks with tags and subtasks.

#### Project 3 (no `tasks.txt`)

An empty project folder named `Project 3` without a `tasks.txt` file.

**Purpose**: Tests the "Empty" filter functionality.

## Acceptance Criteria

- [ ] Tasks dialog opens when clicking "Tasks" button in header
- [ ] Dialog displays title "Tasks" with filter buttons (All, Available, Today, Empty)
- [ ] "Show Completed" checkbox is visible and functional
- [ ] Left sidebar lists all projects with task counts
- [ ] Main content area shows tasks grouped by project
- [ ] Tasks display subtask completion indicators (e.g., "0/4")
- [ ] Date tags (due, scheduled, defer) are shown where applicable
- [ ] "All" filter shows all incomplete tasks
- [ ] "Available" filter hides deferred tasks
- [ ] "Today" filter shows only tasks due/scheduled for today
- [ ] "Empty" filter shows projects without tasks.txt
- [ ] Dialog closes when clicking the close button
- [ ] Keyboard shortcuts hint is displayed at bottom
