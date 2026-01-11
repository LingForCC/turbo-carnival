# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, right sidebar) with collapsible side panels. The left panel manages local folder projects that can be added/removed via the native folder picker dialog.

## Build and Development Commands

- `npm run dev` - Start Vite dev server with hot reload for main, preload, and renderer processes
- `npm run build` - Full production build using Vite
- `npm start` - Build and launch the Electron app
- `npm run preview` - Preview Vite production build

## Architecture

### Electron Process Structure
The app follows standard Electron architecture:

- **Main Process** (`src/main.ts`) - Creates BrowserWindow, handles app lifecycle, and manages IPC handlers for project storage
- **Preload Script** (`src/preload.ts`) - Bridges main and renderer via contextBridge, exposes `window.electronAPI` with:
  - `platform` - Current platform (darwin/win32/linux)
  - `openFolderDialog()` - Opens native folder picker dialog
  - `getProjects()` - Retrieves all saved projects from storage
  - `addProject(path)` - Adds a new project from a folder path
  - `removeProject(path)` - Removes a project by path
- **Renderer Process** (`src/renderer.ts`) - Web Components UI, runs in browser context

### Build System
The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload) and `dist-renderer/` (renderer)

### UI Architecture: Web Components
The renderer uses vanilla JavaScript Web Components (not Vue/React). Each component is a TypeScript class extending `HTMLElement`:

- `app-container` (`src/components/app-container.ts`) - Root layout container, manages panel visibility and toggle buttons
- `project-panel` (`src/components/project-panel.ts`) - Collapsible left sidebar (264px wide when expanded) that manages local folder projects with add/remove/select functionality
- `right-panel` (`src/components/right-panel.ts`) - Collapsible right sidebar (264px wide when expanded)
- `middle-panel` (`src/components/middle-panel.ts`) - Center content area with textarea

#### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `text-change`, `project-selected`)

### Styling
- **Tailwind CSS v4** with PostCSS - See `postcss.config.js` and `src/styles.css`
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component
- Tailwind v4 uses the new `@import "tailwindcss";` syntax in styles.css

### Type Definitions
- **Global types** (`src/global.d.ts`) - TypeScript declarations for the entire app
  - `Project` interface - Represents a local folder project with `path`, `name`, and `addedAt` properties
  - `ElectronAPI` interface - Defines the exposed API methods from the preload script

### TypeScript Configuration
- Target: ES2020, Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root

### IPC Communication and Project Storage
The app uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes:

**IPC Channels:**
- `dialog:openFolder` - Opens native folder picker dialog, returns folder path or null
- `projects:get` - Returns all saved projects from storage
- `projects:add` - Adds a new project (prevents duplicates)
- `projects:remove` - Removes a project by path

**Project Storage:**
- Projects are stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path` (absolute path), `name` (folder name), `addedAt` (timestamp)
- Projects persist across app restarts
- `loadProjects()` and `saveProjects()` helpers in main process handle serialization

## Development Notes

### Event Listener Management
Web Components use a unique pattern to prevent duplicate event listeners: after rendering, buttons are cloned and replaced before attaching new listeners. This is visible in all panel components.

### Context Isolation
The app uses `contextIsolation: true` and `nodeIntegration: false` for security. All communication between main and renderer goes through the preload script's `contextBridge.exposeInMainWorld()`.

### Dev Mode Detection
In `src/main.ts:39-40`, development mode is detected via:
```javascript
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !fs.existsSync(path.join(__dirname, '../dist-renderer/index.html')));
```
When in dev, the app loads from `http://localhost:5173` (Vite dev server) and opens DevTools automatically.

### Hot Module Replacement
Vite's HMR automatically reloads the renderer when files change. The main process and preload script also restart automatically on changes during development.
