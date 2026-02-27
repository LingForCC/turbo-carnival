# Testing

The project uses multiple testing approaches:

- **Jest** with **ts-jest** for unit and component tests (this document)
- **Playwright MCP** for End-to-End (E2E) tests - use `/e2e-test` skill

## Test Types Overview

| Type | Tool | Location | Purpose |
|------|------|----------|---------|
| Functional Tests | Jest | `src/__tests__/*/main/` | Test main process logic, IPC handlers, transformers |
| Web Component Tests | Jest + Happy DOM | `src/__tests__/*/components/` | Test Web Components rendering and interactions |
| E2E Tests | Playwright MCP | `e2e/` | Test complete user flows |

## Functional Tests

Functional tests cover main process logic, IPC handlers, and data transformers using Jest.

### Test Structure

```
src/__tests__/
├── helpers/                    # Shared test utilities and mocks
├── project/main/               # Project management tests
├── conversation/transformers/  # Message format transformers
└── settings/main/              # Settings storage and IPC tests
```

#### `src/__tests__/project/main/`
- `projects.test.ts` - Storage helper tests (getProjectsPath, loadProjects, saveProjects)
- `file-tree.test.ts` - File tree helper tests (isHidden, buildFileTree)
- `file-listing.test.ts` - File listing helper tests (listFilesRecursive)
- `ipc-handlers.test.ts` - IPC handler tests (projects:add, projects:remove, project:getFileTree, files:list, files:readContents)

#### `src/__tests__/conversation/transformers/`
- `openai-transformer.test.ts` - OpenAI message format transformer tests
- `glm-transformer.test.ts` - GLM message format transformer tests

#### `src/__tests__/settings/main/`
- `settings.test.ts` - Settings storage and IPC handler tests

#### `src/__tests__/helpers/`
- `file-system.ts` - Mock file system utilities
- `mocks.ts` - Mock data factories for projects, agents, MCP servers, etc.

### Module System and Mocking

The project uses **CommonJS mode**, not ESM (`"type": "module"` is NOT set in package.json). TypeScript compiles ESM-style imports to CommonJS with `esModuleInterop: true`.

#### Critical Mocking Pattern

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

### Important Notes

#### No @jest/globals Import
- The project uses CommonJS mode, NOT ESM
- Do NOT use `import { jest } from '@jest/globals'` - this is only for ESM mode
- Jest's global `jest`, `describe`, `it`, `expect` are available automatically

#### Mock Cleanup
- Global fs mock is automatically cleared before each test via `beforeEach()` in jest.setup.ts
- Test-specific mocks should be cleared in `afterEach()` or `afterAll()`
- Use `jest.clearAllMocks()` to reset mock call counts
- Use `jest.restoreAllMocks()` to restore original implementations

#### Test Isolation
- Each test should be independent and not rely on state from other tests
- Use `setupMockFS({})` to create a clean file system for each test
- Always call `cleanup()` from `setupMockFS()` in `afterEach()` if needed

## Web Component Testing

Web Components are tested using **Happy DOM** (a lightweight DOM implementation) alongside Jest. This enables testing of UI rendering, user interactions, events, and security.

### Test Structure

```
src/__tests__/
├── helpers/component-testing.ts   # Web Component testing utilities
├── project/components/            # Project panel tests
├── agent/components/              # Agent panel tests
├── conversation/components/       # Conversation panel tests
└── settings/components/           # Settings dialog tests
```

#### `src/__tests__/project/components/`
- `project-panel.test.ts` - Web Component UI tests (rendering, interactions, events, XSS prevention)

#### `src/__tests__/agent/components/`
- `app-panel.test.ts` - Web Component UI tests for App-type agents (rendering, code view toggle, streaming, XSS prevention)

#### `src/__tests__/conversation/components/`
- `conversation-panel.test.ts` - Web Component UI tests (rendering, file tagging, message sending, streaming, tool calls, XSS prevention)

#### `src/__tests__/settings/components/`
- `settings-dialog.test.ts` - Settings dialog UI tests

### Setup Files

**`jest.setup-components.ts`** - Global setup for component tests:
- Mocks `window.electronAPI` with all IPC methods as Jest mocks
- Clears mocks and DOM before each test
- Must be configured in `jest.config.js` for component test files

### What to Test

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
