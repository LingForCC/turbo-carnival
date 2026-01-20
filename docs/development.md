# Development Notes

## Critical Patterns

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

## Environment Details

### Context Isolation
The app uses `contextIsolation: true` and `nodeIntegration: false` for security. All communication between main and renderer goes through the preload script's `contextBridge.exposeInMainWorld()`.

### Dev Mode Detection
In `src/main.ts:16-17`, development mode is detected via:
```javascript
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !fs.existsSync(path.join(__dirname, '../dist-renderer/index.html')));
```
When in dev, the app loads from `http://localhost:5173` (Vite dev server) and opens DevTools automatically.

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

## Styling

- **Tailwind CSS v4** with PostCSS - See `postcss.config.js` and `src/styles.css`
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component
- Tailwind v4 uses the new `@import "tailwindcss";` syntax in styles.css

## Common Tasks

### Adding a New Component

1. Create TypeScript class extending `HTMLElement`
2. Implement `connectedCallback()`, `render()`, and `attachEventListeners()`
3. Use clone-and-replace pattern for event listeners
4. Emit custom events for parent communication
5. Import and register in renderer or parent component
6. **Write automation tests** in `src/__tests__/components/` (see testing.md)
7. **Update documentation**:
   - Add component to "UI Components" section in CLAUDE.md
   - Document any new events or patterns in relevant feature docs

### Adding a New Main Process Module

1. Create file in `src/main/` (e.g., `src/main/feature-name.ts`)
2. Export storage helpers and a `registerFeatureIPCHandlers()` function
3. Import and call registration function in `src/main.ts`
4. If needed, import functions from other modules
5. **Write tests** for storage helpers and IPC handlers
6. **Update documentation**:
   - Add module to "Module Organization" section in docs/architecture.md
   - Document IPC channels in relevant IPC sections
   - Add module to "Main Process Modules" in CLAUDE.md

### Documentation Maintenance

**Always update documentation after code changes when:**
- Adding new modules, components, or features
- Modifying IPC channels or storage locations
- Changing critical patterns or best practices
- Updating test structure or configuration

**Key files to update:**
- **CLAUDE.md** - Quick reference for modules, components, IPC channels
- **docs/architecture.md** - Module organization, IPC channels, storage
- **docs/features/[feature].md** - Feature-specific implementation details
- **docs/testing.md** - Test structure and testing patterns

For detailed guidance, see "Documentation Maintenance" in CLAUDE.md.

### Adding IPC Handler

1. Add handler in appropriate module's `register*IPCHandlers()` function
2. Expose method in preload script via `contextBridge`
3. Use in renderer via `window.electronAPI.methodName()`
4. Handle errors gracefully
5. Document in architecture.md

## Agent Configuration

Agents are stored as `agent-{sanitized-name}.json` files in project folders:

```json
{
  "name": "Chat Assistant",
  "type": "chat",
  "description": "Helpful assistant",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "topP": 1.0,
    "apiKeyRef": "openai-main",
    "baseURL": "https://api.openai.com/v1"
  },
  "prompts": {
    "system": "You are a helpful assistant.",
    "user": ""
  },
  "history": [],
  "settings": {}
}
```

## API Key Management

API keys stored globally in `app.getPath('userData')/api-keys.json`:

```json
{
  "name": "openai-main",
  "key": "sk-...",
  "baseURL": "https://api.openai.com/v1",
  "addedAt": "2024-01-01T00:00:00.000Z"
}
```

Agents reference keys by name via `config.apiKeyRef`.

## Debugging Tips

### Main Process
- Use `console.log()` - output in terminal where app was launched
- DevTools open automatically in dev mode
- Check userData path for stored files (projects, agents, API keys, tools)

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
