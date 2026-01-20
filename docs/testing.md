# Testing

The project uses **Jest** with **ts-jest** for testing TypeScript code.

## Test Commands

- `npm test` - Run all tests once **with coverage report** (coverage table shown at end)
- `npm run test:no-coverage` - Run all tests once **without coverage** (faster, no report)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (same as `npm test`)
- `npm run test:verbose` - Run tests with verbose output

## When to Run Tests

**Automated Testing Requirements:**
- **After any code change**: Run tests for the affected module(s)
- **Before considering work complete**: Ensure all tests pass
- **After adding new features**: Run full test suite with coverage

**Priority Order:**
1. Run tests without coverage for fastest feedback during development
2. Run with coverage only when validating completeness of work
3. Use watch mode when actively developing on a feature

## Test Configuration

- **Config File**: `jest.config.js`
- **Setup File**: `jest.setup.ts` (runs before each test suite)
- **Environment**: Node.js (for main process tests)
- **Module System**: CommonJS (not ESM)
- **Test Pattern**: `**/__tests__/**/*.test.ts` or `**/?(*.)+(spec|test).ts`

## Module System and Mocking

The project uses **CommonJS mode**, not ESM (`"type": "module"` is NOT set in package.json). TypeScript compiles ESM-style imports to CommonJS with `esModuleInterop: true`.

### Critical Mocking Pattern

When mocking modules in CommonJS mode with `esModuleInterop`, use direct function implementations (NOT wrapped in `jest.fn()`) to ensure compatibility with TypeScript's transpilation:

```typescript
// jest.setup.ts
jest.mock('fs', () => {
  // Direct function implementation - NOT jest.fn()
  const readFileSync = function(filePath: any, _encoding: any) {
    return mockFiles[filePath];
  };

  return {
    readFileSync,
    writeFileSync: function(filePath: any, content: any) { ... },
    existsSync: function(filePath: any) { ... },
    __esModule: true,  // CRITICAL for esModuleInterop
    default: {
      readFileSync,
      writeFileSync,
      existsSync,
    },
  };
});
```

**Do NOT use this pattern** (it doesn't work with CommonJS + esModuleInterop):
```typescript
// ❌ WRONG - Returns undefined in CommonJS mode
jest.mock('fs', () => ({
  readFileSync: jest.fn((path, enc) => ...),  // Wrapped in jest.fn()
  __esModule: true,
}));
```

## Global Mocks (jest.setup.ts)

### `fs` Module
- In-memory file store for testing file operations
- Mocked functions: `existsSync`, `readFileSync`, `writeFileSync`, `readdirSync`, `statSync`, `unlinkSync`, `mkdirSync`
- Automatically cleared before each test via `beforeEach()` hook
- Includes `__clearMockFsFiles()` global function for manual cleanup

### `path` Module
- Simple path operations for consistent test paths
- Mocked functions: `join`, `basename`, `dirname`, `extname`, `relative`, `resolve`, `normalize`, `isAbsolute`, `parse`, `format`
- Uses Unix-style paths (`/`) regardless of platform

### `electron` Module
- Mocked Electron APIs for main process testing
- Mocked properties: `app.getPath()`, `ipcMain`, `ipcRenderer`, `dialog`, `BrowserWindow`
- Returns mock paths like `/mock/userdata` for `app.getPath('userData')`

## Test Helpers

Located in `src/__tests__/helpers/`:

### `file-system.ts`
- `setupMockFS(mockFiles)` - Populates the global fs mock with initial test data
- `clearMockFiles()` - Clears the local test file cache
- `addMockFile(path, content)` - Adds a file to the mock during a test
- `getMockFile(path)` - Reads a file from the mock during a test

### `mocks.ts`
- `createMockProject(overrides)` - Creates a mock Project object
- `createMockAgent(overrides)` - Creates a mock Agent object
- `createMockFileSystem()` - Creates an in-memory file system object
- `createTestProjectStructure(path, agents)` - Creates mock files for a project with agents

## Test Structure

Tests are organized in `src/__tests__/` by feature:

### `src/__tests__/main/project-management/`
- `projects.test.ts` - Storage helper tests (getProjectsPath, loadProjects, saveProjects)
- `file-tree.test.ts` - File tree helper tests (isHidden, buildFileTree)
- `file-listing.test.ts` - File listing helper tests (listFilesRecursive)
- `ipc-handlers.test.ts` - IPC handler tests (projects:add, projects:remove, project:getFileTree, files:list, files:readContents)

### `src/__tests__/main/apiKey-management/`
- `api-keys.test.ts` - Storage helper tests (getAPIKeysPath, loadAPIKeys, saveAPIKeys, getAPIKeyByName)
- `ipc-handlers.test.ts` - IPC handler tests (api-keys:get, api-keys:add, api-keys:remove)

### `src/__tests__/components/`
- `project-panel/project-panel.test.ts` - Web Component UI tests (rendering, interactions, events, XSS prevention)

### `src/__tests__/helpers/`
- Shared test utilities and mocks

## Example Test

```typescript
// src/__tests__/project-management/projects.test.ts
import { getProjectsPath, loadProjects, saveProjects } from '../../main/project-management';
import { createMockProject } from '../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../helpers/file-system';
import type { Project } from '../../global.d';

describe('Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  it('should save and load projects', () => {
    const { cleanup } = setupMockFS({});

    const projects: Project[] = [
      createMockProject({ path: '/project1', name: 'project1' }),
    ];

    saveProjects(projects);
    const loadedProjects = loadProjects();

    expect(loadedProjects).toHaveLength(1);
    expect(loadedProjects[0].path).toBe('/project1');

    cleanup();
  });
});
```

## Important Notes

### No @jest/globals Import
- The project uses CommonJS mode, NOT ESM
- Do NOT use `import { jest } from '@jest/globals'` - this is only for ESM mode
- Jest's global `jest`, `describe`, `it`, `expect` are available automatically

### Mock Cleanup
- Global fs mock is automatically cleared before each test via `beforeEach()` in jest.setup.ts
- Test-specific mocks should be cleared in `afterEach()` or `afterAll()`
- Use `jest.clearAllMocks()` to reset mock call counts
- Use `jest.restoreAllMocks()` to restore original implementations

### Test Isolation
- Each test should be independent and not rely on state from other tests
- Use `setupMockFS({})` to create a clean file system for each test
- Always call `cleanup()` from `setupMockFS()` in `afterEach()` if needed

## Writing New Tests

1. **Create test file** in appropriate `src/__tests__/` directory
2. **Import dependencies** - the module being tested and test helpers
3. **Setup mocks** - Use `setupMockFS()` for file system tests
4. **Write tests** - Use `describe()` and `it()` blocks
5. **Clean up** - Use `afterEach()` or `afterAll()` for cleanup
6. **Run tests** - Use `npm run test:no-coverage` for fast feedback

## Test First Approach

- When adding new features, write or update tests first
- Ensure existing tests still pass after changes
- Use `npm run test:watch` for continuous testing during active development

## Web Component Automation Testing

Web Components are tested using **Happy DOM** (a lightweight DOM implementation) alongside Jest. This enables testing of UI rendering, user interactions, events, and security.

### Setup Files

**`jest.setup-components.ts`** - Global setup for component tests:
- Mocks `window.electronAPI` with all IPC methods as Jest mocks
- Clears mocks and DOM before each test
- Must be configured in `jest.config.js` for component test files

### Component Testing Helpers

Located in `src/__tests__/helpers/component-testing.ts`:

#### `mountComponent<T>(tagName, properties?)`
Mounts a custom element and returns testing helpers.

```typescript
const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');
expect(element.querySelector('h2')).toBeTruthy();
cleanup();
```

**Returns:**
- `element: T` - The mounted custom element
- `querySelector(selectors)` - Bound querySelector for the element
- `cleanup()` - Removes element from DOM

#### `mockElectronAPI(method, implementation)`
Mocks a specific `window.electronAPI` method.

```typescript
mockElectronAPI('getProjects', jest.fn().mockResolvedValue([
  createMockProject({ name: 'test' })
]));
```

#### `createMockProject(overrides?)`
Creates a mock Project object (also exported from `mocks.ts`).

#### `waitForAsync(ms?)`
Waits for promises to resolve (useful for `connectedCallback` async operations).

```typescript
await waitForAsync(); // Wait for next tick
await waitForAsync(50); // Wait 50ms for slower operations
```

#### `spyOnEvent<T>(element, eventName)`
Creates a promise that resolves when a custom event is dispatched.

```typescript
const eventPromise = spyOnEvent(element, 'project-selected');
element.click();
const event = await eventPromise;
expect(event.detail.project).toBeDefined();
```

### What to Test in Web Components

#### 1. Rendering Tests
Verify correct DOM structure and content:
- Initial structure (headers, buttons, containers)
- Expanded/collapsed states
- Empty states (no data)
- Data rendering (lists, items)
- Styling classes (Tailwind classes)
- HTML escaping (XSS prevention)

#### 2. Interaction Tests
Verify user interactions work correctly:
- Button clicks (toggle, add, remove)
- Item selection (click handlers)
- Form input and submission
- Event dispatching with correct detail

#### 3. Public Method Tests
Verify public APIs work as expected:
- `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`
- State getters (e.g., `getCollapsed()`)

#### 4. Async Operation Tests
Verify async operations complete correctly:
- `connectedCallback` loading data
- IPC calls for add/remove/update operations
- Error handling with `console.error` spies

#### 5. Event Tests
Verify custom events are dispatched correctly:
- Event name matches expected
- Event detail contains correct data
- Events bubble and compose as expected
- Events are not dispatched when they shouldn't be

### Example Web Component Test

```typescript
import { mountComponent, createMockProject, mockElectronAPI, waitForAsync, spyOnEvent } from '../../helpers/component-testing';

interface ProjectPanel extends HTMLElement {
  collapse(): void;
  expand(): void;
  getCollapsed(): boolean;
}

describe('ProjectPanel Web Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render with correct initial structure', async () => {
    mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
    const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

    await waitForAsync();

    expect(element.querySelector('h2')?.textContent).toBe('Projects');
    expect(element.querySelector('#toggle-btn')).toBeTruthy();

    cleanup();
  });

  it('should dispatch project-selected event when clicked', async () => {
    const mockProjects = [createMockProject({ name: 'project1', path: '/path1' })];
    mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
    const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

    await waitForAsync();

    const eventPromise = spyOnEvent(element, 'project-selected');
    const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
    projectItem.click();

    const event = await eventPromise;
    expect(event.detail.project).toEqual(mockProjects[0]);

    cleanup();
  });

  it('should escape HTML in project names', async () => {
    const mockProjects = [
      createMockProject({ name: '<script>alert("xss")</script>', path: '/path1' }),
    ];
    mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
    const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

    await waitForAsync();

    const projectItem = element.querySelector('[data-project-path="/path1"]');
    expect(projectItem?.innerHTML).not.toContain('<script>');
    expect(projectItem?.innerHTML).toContain('&lt;script&gt;');

    cleanup();
  });
});
```

### Important Notes for Component Tests

1. **Always await async operations**: Use `waitForAsync()` after mounting, clicking, or any operation that triggers async code
2. **Cleanup after each test**: Always call `cleanup()` to remove elements from DOM
3. **Mock before mounting**: Set up `mockElectronAPI()` before calling `mountComponent()`
4. **Query elements after async**: DOM changes happen after async operations complete
5. **XSS testing is critical**: Always test that user input is properly escaped
6. **Event bubbling**: Verify events bubble correctly by listening on `document`
7. **Clone-and-replace pattern**: Tests verify that duplicate listeners are prevented
