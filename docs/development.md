# Development Notes

## Critical Patterns

### Pattern for Creating New Modules
1. Create a new feature directory under `src/` (e.g., `src/new-feature/`)
2. Create subdirectories: `main/`, `components/`, `preload/`, `api/`, `types/`
3. Export storage/helper functions and a `registerFeatureIPCHandlers()` function in `main/`
4. Import and call the registration function in `src/main.ts`
5. Expose preload functions in `src/preload.ts`
6. Update CLAUDE.md to document the new module

### Event Listener Management (CRITICAL)

Web Components use a unique pattern to prevent duplicate event listeners: after rendering, buttons are cloned and replaced before attaching new listeners.

**Why this is essential:**
Without this pattern, event listeners accumulate on old DOM elements and new elements may not have listeners attached.

**Where to use:**
- Panel toggle buttons
- Tree node clicks (directory expansion/collapse)
- Any dynamically generated interactive elements

**Pattern:**
```typescript
// Clone the element to remove old listeners
const newElement = element.cloneNode(true);
// Replace the old element with the clone
element.replaceWith(newElement);
// Attach fresh listeners to the new element
(newElement as HTMLElement).addEventListener('click', handler);
```

**Implementation example:**
See `src/components/project-panel.ts:82-90` or any panel component's `attachEventListeners()` method.

### Event Bubbling Best Practices

When forwarding events between components, use `bubbles: false` to prevent infinite loops:

```javascript
// BAD: Creates infinite loop
target.dispatchEvent(new CustomEvent('event-name', {
  detail: data,
  bubbles: true,  // Event bubbles back to sender!
  composed: true
}));

// GOOD: Event doesn't bubble back
target.dispatchEvent(new CustomEvent('event-name', {
  detail: data,
  bubbles: false,  // Prevents infinite loop
  composed: true
}));
```

### Using the Renderer API Layer

When creating renderer components that need API access:

```typescript
// Import the API getter function and types from the feature module
import { getProjectManagementAPI } from '../project/api';
import type { ProjectManagementAPI, Project } from '../project/types';

export class MyComponent extends HTMLElement {
  private api: ProjectManagementAPI;

  constructor() {
    super();
    this.api = getProjectManagementAPI();
  }

  async loadProjects() {
    const projects = await this.api.getProjects();
    // ... rest of implementation
  }
}
```

**Benefits:**
- Type safety through interface types
- Easy to mock in tests
- No direct dependency on `window.electronAPI`
- Prevents bundling Electron APIs into renderer code

## Environment Details

### Context Isolation
The app uses `contextIsolation: true` and `nodeIntegration: false` for security. All communication between main and renderer goes through the preload script's `contextBridge.exposeInMainWorld()`.

### Hot Module Replacement
Vite's HMR automatically reloads the renderer when files change. The main process and preload script also restart automatically on changes during development.

## Security

### XSS Prevention
All user-generated content displayed in the UI must be escaped using the `escapeHtml()` helper:

```typescript
private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

Use this for:
- File names and folder names in file tree
- File names in @mention autocomplete
- Any user input displayed in UI
- Data attributes (escape the value before setting)

### Error Handling
The app uses graceful degradation for errors:
- Missing project folders return empty agent arrays
- Corrupted agent files log warnings and skip that file
- User-facing operations (add/edit/delete) show alert dialogs on failure
- Main process validates all inputs and throws descriptive errors
- Chat operations validate API key existence before attempting API calls
- Chat errors (timeouts, API failures) display user-friendly messages

## Debugging Tips

### Main Process
- Use `console.log()` - output in terminal where app was launched
- DevTools open automatically in dev mode
- Check userData path for stored files (projects, providers, model-configs, tools)

### Renderer Process
- Use DevTools (open automatically in dev mode)
- Check Components panel for Web Component shadow DOM
- Use debugger statements in TypeScript files
- Console logs appear in DevTools console

### IPC Communication
- Use `console.log()` in both main and renderer to trace IPC calls
- Check IPC channel names match exactly between main and preload
- Verify event listener registration in main process
- Check `contextBridge` exposure in preload script
