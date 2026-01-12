# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, right sidebar) with collapsible side panels. The left panel manages local folder projects that can be added/removed via the native folder picker dialog. Each project can be associated with multiple AI agents, which are stored as `agent-{name}.json` files in the project folder.

The app includes a **conversational AI interface** that allows users to chat with their configured agents using OpenAI-compatible APIs, with support for both streaming and non-streaming responses. It also includes **global API key management** for secure credential storage.

## Build and Development Commands

- `npm run dev` - Start Vite dev server with hot reload for main, preload, and renderer processes
- `npm run build` - Full production build using Vite
- `npm start` - Build and launch the Electron app
- `npm run preview` - Preview Vite production build

## Architecture

### Electron Process Structure
The app follows standard Electron architecture:

- **Main Process** (`src/main.ts`) - Creates BrowserWindow, handles app lifecycle, and manages IPC handlers for project, agent, API key storage, and OpenAI API client
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
  - `getAPIKeys()` - Retrieves all stored API keys
  - `addAPIKey(apiKey)` - Adds a new API key
  - `removeAPIKey(name)` - Removes an API key by name
  - `sendMessage(projectPath, agentName, message)` - Sends non-streaming chat message
  - `streamMessage(projectPath, agentName, message)` - Initiates streaming chat
  - `onChatChunk(callback)` - Listens for streaming response chunks
  - `onChatComplete(callback)` - Listens for streaming completion
  - `onChatError(callback)` - Listens for streaming errors
- **Renderer Process** (`src/renderer.ts`) - Web Components UI, runs in browser context

### Build System
The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload) and `dist-renderer/` (renderer)

### UI Architecture: Web Components
The renderer uses vanilla JavaScript Web Components (not Vue/React). Each component is a TypeScript class extending `HTMLElement`:

- `app-container` (`src/components/app-container.ts`) - Root layout container, manages panel visibility and toggle buttons, forwards events between components, manages API keys dialog
- `project-panel` (`src/components/project-panel.ts`) - Collapsible left sidebar (264px wide when expanded) that manages local folder projects with add/remove/select functionality
- `project-agent-dashboard` (`src/components/project-agent-dashboard.ts`) - Center content area that displays agents for the selected project in a grid layout with add/edit/delete functionality, handles dashboard/chat view switching
- `chat-panel` (`src/components/chat-panel.ts`) - Interactive chat interface for AI agents with streaming/non-streaming support, message history, and back navigation
- `right-panel` (`src/components/right-panel.ts`) - Collapsible right sidebar (264px wide when expanded)
- `agent-form-dialog` (`src/components/agent-form-dialog.ts`) - Modal dialog for creating and editing agents
- `api-keys-dialog` (`src/components/api-keys-dialog.ts`) - Modal dialog for managing global API keys with add/edit/delete functionality

#### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`, `chat-back`, `api-keys-dialog-close`)

#### Event Flow
1. User clicks project in `project-panel` → emits `project-selected` event (bubbles, composed)
2. `app-container` catches event → forwards to `project-agent-dashboard` with `bubbles: false` to prevent infinite loop
3. `project-agent-dashboard.handleProjectSelected()` loads agents via IPC
4. User clicks agent card → `project-agent-dashboard` emits `agent-selected` event, switches to chat view
5. `chat-panel` loads and displays conversation, connects to IPC for messaging
6. User clicks back button → `chat-panel` emits `chat-back` event, returns to dashboard view

#### Dashboard/Chat View Switching
The `project-agent-dashboard` component has two display modes:
- **Dashboard mode** (default): Grid of agent cards with add/edit/delete actions
- **Chat mode**: Shows the `chat-panel` component for the selected agent

When an agent is selected via the `agent-selected` event, the dashboard hides the agent grid and shows the chat panel. The `chat-back` event reverses this.

### Conversational AI Feature

The app provides a complete chat interface for interacting with AI agents through OpenAI-compatible APIs.

**Chat Features:**
- **Streaming responses** - Real-time token streaming with loading indicators
- **Non-streaming mode** - Full response at once (configurable via toggle)
- **Conversation persistence** - Messages stored in agent `history` array
- **Context awareness** - System prompt + full conversation history sent with each message
- **Error handling** - Graceful timeout and error message display
- **Message management** - Clear chat with confirmation, automatic scroll to latest

**Chat UI Components:**
- Message container with automatic scrolling
- User and assistant message bubbles with different styling
- Loading indicator during streaming
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Streaming toggle in chat header
- Back button to return to agent dashboard

**Message Flow:**
1. User enters message in `chat-panel` text area
2. `chat-panel` calls IPC method (`streamMessage` or `sendMessage`)
3. Main process validates agent and API key
4. Main process compiles messages: system prompt + conversation history + new message
5. Main process calls OpenAI-compatible API with agent's model config
6. Response chunks/events sent back via IPC events (`chat-chunk`, `chat-complete`, `chat-error`)
7. `chat-panel` updates UI in real-time, saves completed messages to agent file

**API Integration:**
- Supports OpenAI and compatible APIs (via custom `baseURL`)
- Configurable model, temperature, maxTokens, topP per agent
- Request timeout: 60 seconds
- Server-Sent Events (SSE) for streaming responses

### API Key Management

The app includes global API key storage for secure credential management across all agents.

**API Key Storage:**
- API keys stored in `app.getPath('userData')/api-keys.json`
- Each key contains: `name`, `key` (secret), `baseURL` (optional), `addedAt` (timestamp)
- Agents reference API keys by name via `config.apiKeyRef` property
- Keys persist across app restarts

**API Key Operations:**
- Access via "API Keys" button in app header (opens `api-keys-dialog`)
- Add/Edit keys with form validation (name required, key required)
- Delete keys with confirmation dialog
- Base URL is optional - defaults to OpenAI's API if not provided
- Custom base URLs enable use of OpenAI-compatible APIs (e.g., local models, other providers)

**Security:**
- Password input type for key fields (masked)
- Keys never exposed in agent files (only referenced by name)
- Validation ensures referenced keys exist before chat operations

**Agent Configuration:**
```typescript
// Agent with API key reference
{
  "name": "Chat Assistant",
  "config": {
    "model": "gpt-4",
    "apiKeyRef": "openai-main",  // References named API key
    "baseURL": "https://api.openai.com/v1"  // Optional override
  }
}
```

### Agent Feature
Each project can have multiple AI agents associated with it. Agents are stored as `agent-{sanitized-name}.json` files directly in the project folder (not in userData).

**Agent Metadata:**
- `name` - Unique agent identifier
- `type` - Agent category (chat, code, assistant, reviewer, custom)
- `description` - Human-readable description
- `config` - Model configuration (model, temperature, maxTokens, topP, apiKeyRef, baseURL)
- `prompts` - System and user prompt templates
- `history` - Conversation history array with timestamps and role (user/assistant)
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
- Agent conversation history persisted automatically in agent file
- Agents can reference global API keys by name

### Styling
- **Tailwind CSS v4** with PostCSS - See `postcss.config.js` and `src/styles.css`
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component
- Tailwind v4 uses the new `@import "tailwindcss";` syntax in styles.css

### Type Definitions
- **Global types** (`src/global.d.ts`) - TypeScript declarations for the entire app
  - `Project` interface - Represents a local folder project with `path`, `name`, and `addedAt` properties
  - `Agent` interface - Represents an AI agent with full metadata including conversation history
  - `AgentConfig` interface - Model configuration options (model, temperature, maxTokens, topP, apiKeyRef, baseURL)
  - `AgentPrompts` interface - System and user prompts
  - `ConversationMessage` interface - Messages in conversation history with role, content, and timestamp
  - `AgentSettings` interface - Flexible settings object
  - `APIKey` interface - Global API key storage with name, key, baseURL, and addedAt
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

**API Key IPC Channels:**
- `api-keys:get` - Returns all stored API keys
- `api-keys:add` - Adds a new API key (validates and saves to api-keys.json)
- `api-keys:remove` - Removes an API key by name

**Chat IPC Channels:**
- `chat:sendMessage` - Sends non-streaming message, returns full response
- `chat:streamMessage` - Initiates streaming message exchange
- `chat-chunk` - Event emitted for each response chunk during streaming (via `webContents.send()`)
- `chat-complete` - Event emitted when streaming completes successfully
- `chat-error` - Event emitted when streaming encounters an error

**Project Storage:**
- Projects are stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path` (absolute path), `name` (folder name), `addedAt` (timestamp)
- Projects persist across app restarts
- `loadProjects()` and `saveProjects()` helpers in main process handle serialization

**Agent Storage:**
- Agents are stored as individual JSON files in project folders: `agent-{sanitized-name}.json`
- Agent names are sanitized for filenames (lowercase, special chars removed, spaces to hyphens)
- Each agent file contains complete agent metadata including conversation history
- `loadAgents()`, `saveAgent()`, `deleteAgent()`, `sanitizeAgentName()` helpers in main process

**API Key Storage:**
- API keys stored in `app.getPath('userData')/api-keys.json`
- `loadAPIKeys()`, `saveAPIKey()`, `deleteAPIKey()` helpers in main process
- Keys referenced by agents via `config.apiKeyRef` property name

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
- Chat operations validate API key existence before attempting API calls
- Chat errors (timeouts, API failures) display user-friendly messages

### OpenAI API Integration
The main process includes a complete OpenAI-compatible API client (`src/main.ts`):
- `compileMessages(agent)` - Builds message array from system prompt and conversation history
- `createChatCompletion()` - Makes non-streaming API requests
- `streamChatCompletion()` - Makes streaming API requests with SSE parsing
- Automatic agent file updates after each message exchange
- 60-second timeout for API requests
- Support for custom base URLs and API key references

### Streaming Implementation
Streaming responses use Server-Sent Events (SSE) parsing:
- Response chunks parsed line-by-line for `data: ` prefix
- JSON chunks extracted and accumulated
- Final accumulated content saved to agent history
- Real-time UI updates via IPC events sent to renderer
- Error handling for malformed chunks and network failures
