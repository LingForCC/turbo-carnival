# Testing

The project uses multiple testing approaches:

- **Jest** with **ts-jest** for unit and component tests (this document)
- **Playwright MCP** for End-to-End (E2E) tests - use `/e2e-test` skill

## Test Types Overview

| Type | Tool | Location | Purpose |
|------|------|----------|---------|
| Unit Tests | Jest | `src/__tests__/` | Test isolated functions and modules |
| Component Tests | Jest + Happy DOM | `src/__tests__/components/` | Test Web Components rendering |
| E2E Tests | Playwright MCP | `e2e/` | Test complete user flows |

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

## Test Structure

Tests are organized in `src/__tests__/` by **feature**, mirroring the source code structure. Each feature directory contains subdirectories for `main/` (main process tests) and `components/` (UI component tests).

```
src/__tests__/
├── helpers/                    # Shared test utilities and mocks
├── project/                    # Project management feature tests
│   ├── main/
│   └── components/
├── agent/                      # Agent system feature tests
│   └── components/
├── conversation/               # Conversation system feature tests
│   ├── components/
│   └── transformers/
└── settings/                   # Settings feature tests
    ├── main/
    └── components/
```

### `src/__tests__/project/`
**Main process tests (`main/`):**
- `projects.test.ts` - Storage helper tests (getProjectsPath, loadProjects, saveProjects)
- `file-tree.test.ts` - File tree helper tests (isHidden, buildFileTree)
- `file-listing.test.ts` - File listing helper tests (listFilesRecursive)
- `ipc-handlers.test.ts` - IPC handler tests (projects:add, projects:remove, project:getFileTree, files:list, files:readContents)

**Component tests (`components/`):**
- `project-panel.test.ts` - Web Component UI tests (rendering, interactions, events, XSS prevention)

### `src/__tests__/agent/`
**Component tests (`components/`):**
- `app-panel.test.ts` - Web Component UI tests for App-type agents (rendering, code view toggle, streaming, XSS prevention)

### `src/__tests__/conversation/`
**Component tests (`components/`):**
- `conversation-panel.test.ts` - Web Component UI tests (rendering, file tagging, message sending, streaming, tool calls, XSS prevention)

**Transformer tests (`transformers/`):**
- `openai-transformer.test.ts` - OpenAI message format transformer tests
- `glm-transformer.test.ts` - GLM message format transformer tests

### `src/__tests__/settings/`
**Main process tests (`main/`):**
- `settings.test.ts` - Settings storage and IPC handler tests

**Component tests (`components/`):**
- `settings-dialog.test.ts` - Settings dialog UI tests

### `src/__tests__/helpers/`
- `file-system.ts` - Mock file system utilities
- `component-testing.ts` - Web Component testing utilities
- `mocks.ts` - Mock data factories for projects, agents, MCP servers, etc.

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

#### `createMockMCPServer(overrides?)`
Creates a mock MCP server configuration object.

#### `createMockMCPTool(overrides?)`
Creates a mock MCP tool object with server metadata.

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

## E2E Testing with Playwright MCP

For testing complete user flows in the running Electron application, use the `/e2e-test` skill.

### When to Use E2E Tests

- Validating critical user journeys
- Testing feature integrations
- Verifying UI behavior in real environment
- Bug reproduction and verification

### Usage

```
/e2e-test e2e/scenarios/tasks-view.md
/e2e-test test the tasks view feature
```

The skill handles app startup, test execution, and cleanup automatically.
