# Architecture

## Electron Process Structure

The app follows standard Electron architecture:

### Main Process (`src/main.ts`)
- Creates BrowserWindow
- Handles app lifecycle
- Coordinates all IPC handler registrations

## Feature-Based Module Structure

The codebase is organized into **feature modules**, where all related files for a feature are grouped together. Each feature typically contains:
- `main/` - Main process modules (IPC handlers, business logic)
- `components/` - Web Components for UI
- `preload/` - Preload functions for IPC bridge
- `api/` - Renderer-safe API wrappers
- `types/` - TypeScript type definitions

### Pattern for Creating New Modules
1. Create a new feature directory under `src/` (e.g., `src/new-feature/`)
2. Create subdirectories: `main/`, `components/`, `preload/`, `api/`, `types/`
3. Export storage/helper functions and a `registerFeatureIPCHandlers()` function in `main/`
4. Import and call the registration function in `src/main.ts`
5. Expose preload functions in `src/preload.ts`
6. Update CLAUDE.md to document the new module

### Preload Script (`src/preload.ts`)
- Bridges main and renderer via contextBridge
- Imports from feature preload modules
- Exposes `window.electronAPI` with all API functions

### Renderer Process (`src/renderer.ts`)
- Web Components UI, runs in browser context
- Imports components from feature directories
- Includes browser tool execution handler

## Build System

The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload/tool-worker) and `dist-renderer/` (renderer)

## UI Architecture: Web Components

The renderer uses vanilla JavaScript Web Components. Each component is a TypeScript class extending `HTMLElement`:

### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`, `chat-back`)

### Styling
- **Tailwind CSS v4** with PostCSS - See `postcss.config.js` and `src/styles.css`
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component
- Tailwind v4 uses the new `@import "tailwindcss";` syntax in styles.css

### Scrollbar Styling
Custom scrollbar styles are defined in `src/styles.css` for all elements with `overflow-y-auto`:
- **Width**: 8px
- **Light mode**: Gray scrollbar (`#d1d5db`) with darker hover state (`#9ca3af`)
- **Dark mode**: Dark gray scrollbar (`#4b5563`) with lighter hover state (`#6b7280`)
- **Track**: Transparent background

This ensures scrollbars are always visible (unlike macOS default behavior) in scrollable panels like the project list.

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS
- Lib: ES2021, DOM, DOM.Iterable
- Strict mode enabled
- ES module interop enabled
- Outputs to `dist/` from `src/` root
