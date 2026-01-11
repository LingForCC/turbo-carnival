# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, right sidebar) with collapsible side panels. The left panel manages local folder projects that can be added/removed via the native folder picker dialog. Each project can be associated with multiple AI agents, which are stored as `agent-{name}.json` files in the project folder.

## Build and Development Commands

- `npm run dev` - Start Vite dev server with hot reload for main, preload, and renderer processes
- `npm run build` - Full production build using Vite
- `npm start` - Build and launch the Electron app
- `npm run preview` - Preview Vite production build

## Architecture

### Electron Process Structure
The app follows standard Electron architecture:

- **Main Process** (`src/main.ts`) - Creates BrowserWindow, handles app lifecycle, and manages IPC handlers for project and agent storage
- **Preload Script** (`src/preload.ts`) - Bridges main and renderer via contextBridge, exposes `window.electronAPI` with:
  - `platform` - Current platform (darwin/win32/linux)
  - `openFolderDialog()` - Opens native folder picker dialog
  - `getProjects()` - Retrieves all saved projects from storage
  - `addProject(path)` - Adds a new project from a folder path
  - `removeProject(path)` - Removes a project by path
  - `getAgents(projectPath)` - Retrieves all agents for a project
  - `addAgent(projectPath, agent)` - Adds a new agent to a project
  - `removeAgent(projectPath, agentName)` - Removes an agent from a project
  - `updateAgent(projectPath, agentName, agent)` - Updates an existing agent
- **Renderer Process** (`src/renderer.ts`) - Web Components UI, runs in browser context

### Build System
The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload) and `dist-renderer/` (renderer)

### UI Architecture: Web Components
The renderer uses vanilla JavaScript Web Components (not Vue/React). Each component is a TypeScript class extending `HTMLElement`:

- `app-container` (`src/components/app-container.ts`) - Root layout container, manages panel visibility and toggle buttons, forwards project-selected events to project-agent-dashboard
- `project-panel` (`src/components/project-panel.ts`) - Collapsible left sidebar (264px wide when expanded) that manages local folder projects with add/remove/select functionality
- `project-agent-dashboard` (`src/components/project-agent-dashboard.ts`) - Center content area that displays agents for the selected project in a grid layout with add/edit/delete functionality
- `right-panel` (`src/components/right-panel.ts`) - Collapsible right sidebar (264px wide when expanded)
- `agent-form-dialog` (`src/components/agent-form-dialog.ts`) - Modal dialog for creating and editing agents

#### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`)

#### Event Flow
1. User clicks project in `project-panel` → emits `project-selected` event (bubbles, composed)
2. `app-container` catches event → forwards to `project-agent-dashboard` with `bubbles: false` to prevent infinite loop
3. `project-agent-dashboard.handleProjectSelected()` loads agents via IPC
4. User clicks agent card → `project-agent-dashboard` emits `agent-selected` event for other components

### Agent Feature
Each project can have multiple AI agents associated with it. Agents are stored as `agent-{sanitized-name}.json` files directly in the project folder (not in userData).

**Agent Metadata:**
- `name` - Unique agent identifier
- `type` - Agent category (chat, code, assistant, reviewer, custom)
- `description` - Human-readable description
- `config` - Model configuration (model, temperature, maxTokens, topP)
- `prompts` - System and user prompt templates
- `history` - Conversation history array
- `settings` - Flexible object for custom settings

**Agent File Format:**
```
/my-project/
  ├── agent-code-reviewer.json
  ├── agent-chat-assistant.json
  └── agent-bug-finder.json
```

**Agent Operations:**
- Create agents via "Add Agent" button in project-agent-dashboard
- Edit/delete agents via card actions (visible on hover)
- Agent selection emits `agent-selected` event with `{ agent, project }` detail

### Styling
- **Tailwind CSS v4** with PostCSS - See `postcss.config.js` and `src/styles.css`
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component
- Tailwind v4 uses the new `@import "tailwindcss";` syntax in styles.css

### Type Definitions
- **Global types** (`src/global.d.ts`) - TypeScript declarations for the entire app
  - `Project` interface - Represents a local folder project with `path`, `name`, and `addedAt` properties
  - `Agent` interface - Represents an AI agent with full metadata
  - `AgentConfig` interface - Model configuration options
  - `AgentPrompts` interface - System and user prompts
  - `ConversationMessage` interface - Messages in conversation history
  - `AgentSettings` interface - Flexible settings object
  - `ElectronAPI` interface - Defines the exposed API methods from the preload script

### TypeScript Configuration
- Target: ES2020, Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root

### IPC Communication
The app uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes:

**Project IPC Channels:**
- `dialog:openFolder` - Opens native folder picker dialog, returns folder path or null
- `projects:get` - Returns all saved projects from storage
- `projects:add` - Adds a new project (prevents duplicates)
- `projects:remove` - Removes a project by path

**Agent IPC Channels:**
- `agents:get` - Returns all agents for a project (reads agent-*.json files from project folder)
- `agents:add` - Adds a new agent to a project (validates and saves agent-{name}.json)
- `agents:remove` - Removes an agent from a project (deletes agent-{name}.json)
- `agents:update` - Updates an existing agent (validates, handles name changes)

**Project Storage:**
- Projects are stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path` (absolute path), `name` (folder name), `addedAt` (timestamp)
- Projects persist across app restarts
- `loadProjects()` and `saveProjects()` helpers in main process handle serialization

**Agent Storage:**
- Agents are stored as individual JSON files in project folders: `agent-{sanitized-name}.json`
- Agent names are sanitized for filenames (lowercase, special chars removed, spaces to hyphens)
- Each agent file contains complete agent metadata
- `loadAgents()`, `saveAgent()`, `deleteAgent()`, `sanitizeAgentName()` helpers in main process

## Development Notes

### Event Listener Management
Web Components use a unique pattern to prevent duplicate event listeners: after rendering, buttons are cloned and replaced before attaching new listeners. This is visible in all panel components.

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

### Context Isolation
The app uses `contextIsolation: true` and `nodeIntegration: false` for security. All communication between main and renderer goes through the preload script's `contextBridge.exposeInMainWorld()`.

### Dev Mode Detection
In `src/main.ts:145-146`, development mode is detected via:
```javascript
const isDev = process.env.NODE_ENV === 'development' ||
              (!app.isPackaged && !fs.existsSync(path.join(__dirname, '../dist-renderer/index.html')));
```
When in dev, the app loads from `http://localhost:5173` (Vite dev server) and opens DevTools automatically.

### Hot Module Replacement
Vite's HMR automatically reloads the renderer when files change. The main process and preload script also restart automatically on changes during development.

### XSS Prevention
All user-generated content displayed in the UI must be escaped using the `escapeHtml()` helper:
```typescript
private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Error Handling
The app uses graceful degradation for errors:
- Missing project folders return empty agent arrays
- Corrupted agent files log warnings and skip that file
- User-facing operations (add/edit/delete) show alert dialogs on failure
- Main process validates all inputs and throws descriptive errors
