---
name: e2e-test
description: Run E2E tests for Turbo Carnival using Playwright MCP. Provide a test scenario file path (e.g., e2e/scenarios/tasks-view.md) or describe the feature to test. Handles app startup, test execution, and cleanup.
user_invocable: true
---

# E2E Test Runner

Execute End-to-End tests for Turbo Carnival using Playwright MCP.

## Usage

```
/e2e-test <scenario-file-or-description>
```

Examples:
- `/e2e-test e2e/scenarios/tasks-view.md`
- `/e2e-test test the tasks view feature`
- `/e2e-test e2e/scenarios/project-management.md`

## Prerequisites Check

Before starting any test:

1. **Ensure app is NOT running** - Playwright MCP will launch it automatically
2. **Verify build exists**: Check that `dist-renderer/` directory exists. If not, run:
   ```bash
   npm run build
   ```
3. **Verify test data directory exists**: `test-user-data/` should exist with sample projects

## Test Execution Process

### Step 1: Read Test Scenario

If a scenario file is provided, read it to understand:
- Goal: What is being tested
- Prerequisites: Required test data in `test-user-data/`
- Acceptance Criteria: Conditions for test to pass

### Step 2: Setup Test Data

Before starting the test:
- Read the Prerequisites section from the scenario
- Check if required test data exists in `test-user-data/`
- **Create** any missing files and directories as specified in the scenario

Example:
```bash
# Create missing test project
mkdir -p test-user-data/Projects/Project\ 3
```

### Step 3: Connect to Playwright MCP

Reconnect to ensure fresh session:
```
/mcp
```

### Step 4: Get the Electron Window

```
mcp__playwright-electron__electron_first_window
```

This automatically launches the app using `electron-wrapper.sh` with the test data directory.

### Step 5: Execute Test Steps

For each test step:

1. **Capture page state**:
   ```
   mcp__playwright-electron__browser_snapshot
   ```

2. **Interact with elements** using refs from snapshot:
   ```
   mcp__playwright-electron__browser_click
     element: "Button description"
     ref: eXX
   ```

3. **Wait for async operations** when needed:
   ```
   mcp__playwright-electron__browser_wait_for
     text: "Expected text"
   ```

4. **Verify results** by taking another snapshot

### Step 6: Cleanup (CRITICAL)

After test completes:

1. **Close any open dialogs** - Click close buttons to leave app in clean state

2. **Kill the Electron process** (browser_close doesn't work for Electron):
   ```bash
   pkill -f "turbo-carnival/node_modules/electron"
   ```

3. **Remove test data created for the test**:
   ```bash
   # Example: Remove project created specifically for this test
   rm -rf test-user-data/Projects/Project\ 3
   ```

**IMPORTANT**: Only remove data that was created for this test. Preserve the baseline `test-user-data/` state.

## Test Report

After completing the test, provide a summary:

1. **Steps performed**: List all interactions
2. **Pass/Fail status**: Did all acceptance criteria pass?
3. **Issues encountered**: Any problems or unexpected behavior
4. **Cleanup completed**: Confirm test data was removed

## Available Test Scenarios

Check `e2e/scenarios/` directory for available test scenario files:
- `tasks-view.md` - Tasks viewing functionality
- `project-management.md` - Project management tests

## Troubleshooting

### Element Not Found
- Take a fresh snapshot - refs change after DOM updates
- Use semantic element descriptions

### App Not Starting
- Run `npm run build` to compile latest code
- Check `test-user-data/` exists

### Duplicate App Instances
- Kill all Electron processes: `pkill -f "electron"`
- Ensure app wasn't started manually before test

### MCP Connection Issues
- Run `/mcp` to reconnect
- Verify `electron-wrapper.sh` is executable: `chmod +x electron-wrapper.sh`
