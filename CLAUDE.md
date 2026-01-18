# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, project detail sidebar) with collapsible side panels. The left panel manages local folder projects that can be added/removed via the native folder picker dialog. Each project can be associated with multiple AI agents, which are stored as `agent-{name}.json` files in the project folder.

The app includes a **conversational AI interface** that allows users to chat with their configured agents using OpenAI-compatible APIs, with support for both streaming and non-streaming responses. It also includes **global API key management** for secure credential storage, a **project detail panel** that displays the file tree structure of selected projects, and **file tagging** for including project files as context in conversations.

## Build and Development Commands

- `npm run dev` - Start Vite dev server with hot reload for main, preload, and renderer processes
- `npm run build` - Full production build using Vite
- `npm start` - Build and launch the Electron app
- `npm run preview` - Preview Vite production build
- `npm test` - Run all tests once **with coverage report** (coverage table shown at end)
- `npm run test:no-coverage` - Run all tests once **without coverage** (faster, no report)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (same as `npm test`)
- `npm run test:verbose` - Run tests with verbose output

## Architecture

### Electron Process Structure
The app follows standard Electron architecture:

- **Main Process** (`src/main.ts`) - Creates BrowserWindow, handles app lifecycle, and coordinates all IPC handler registrations.
- **Project Management Module** (`src/main/project-management.ts`) - Dedicated module for project CRUD operations, including storage helpers (`getProjectsPath`, `loadProjects`, `saveProjects`), file tree helpers (`isHidden`, `buildFileTree`), file listing helpers (`listFilesRecursive`), and IPC handler registration (`registerProjectIPCHandlers`)
- **Agent Management Module** (`src/main/agent-management.ts`) - Dedicated module for agent CRUD operations, including storage helpers (`loadAgents`, `saveAgent`, `deleteAgent`, `sanitizeAgentName`, `getAgentFilePath`) and IPC handler registration (`registerAgentIPCHandlers`)
- **API Key Management Module** (`src/main/apiKey-management.ts`) - Dedicated module for API key CRUD operations, including storage helpers (`getAPIKeysPath`, `loadAPIKeys`, `saveAPIKeys`, `getAPIKeyByName`) and IPC handler registration (`registerApiKeyIPCHandlers`)
- **OpenAI Client Module** (`src/main/openai-client.ts`) - Dedicated module for OpenAI API integration, including API client functions (`callOpenAICompatibleAPI`, `streamOpenAICompatibleAPI`), tool helper functions (`formatToolDescriptions`, `parseToolCalls`), tool worker execution (`executeToolInWorker`), and chat IPC handlers (`chat:sendMessage`, `chat:streamMessage`)
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
  - `getTools()` - Retrieves all stored tools
  - `addTool(tool)` - Adds a new tool
  - `updateTool(toolName, tool)` - Updates an existing tool
  - `removeTool(toolName)` - Removes a tool by name
  - `executeTool(request)` - Executes a tool (routes based on environment)
  - `onBrowserToolExecution(callback)` - Listens for browser tool execution requests from main process
  - `sendBrowserToolResult(result)` - Sends browser tool execution result back to main process
  - `getFileTree(projectPath, options)` - Gets file tree structure for a project folder
  - `listProjectFiles(projectPath, options)` - Lists all .txt and .md files in a project
  - `readFileContents(filePaths)` - Reads multiple file contents at once
  - `sendMessage(projectPath, agentName, message, filePaths)` - Sends non-streaming chat message with optional file context
  - `streamMessage(projectPath, agentName, message, filePaths, ...)` - Initiates streaming chat with optional file context
  - `onChatChunk(callback)` - Listens for streaming response chunks
  - `onChatComplete(callback)` - Listens for streaming completion
  - `onChatError(callback)` - Listens for streaming errors
- **Renderer Process** (`src/renderer.ts`) - Web Components UI, runs in browser context, includes browser tool execution handler that listens for `tools:executeBrowser` events and executes tools via `browser-tool-executor.ts`

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
- `project-detail-panel` (`src/components/project-detail-panel.ts`) - Collapsible right sidebar (264px wide when expanded) that displays recursive file tree of selected project folder
- `agent-form-dialog` (`src/components/agent-form-dialog.ts`) - Modal dialog for creating and editing agents
- `api-keys-dialog` (`src/components/api-keys-dialog.ts`) - Modal dialog for managing global API keys with add/edit/delete functionality
- `tools-dialog` (`src/components/tools-dialog.ts`) - Modal dialog for managing custom tools with add/edit/delete/test functionality, includes environment selector (Node.js vs Browser) and color-coded badges
- `tool-test-dialog` (`src/components/tool-test-dialog.ts`) - Modal dialog for testing tool execution with dynamic form generation based on JSON Schema parameters, routes execution based on tool's environment setting

#### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`, `chat-back`, `api-keys-dialog-close`)

#### Event Flow
1. User clicks project in `project-panel` → emits `project-selected` event (bubbles, composed)
2. `app-container` catches event → forwards to both `project-agent-dashboard` and `project-detail-panel` with `bubbles: false` to prevent infinite loop
3. `project-agent-dashboard.handleProjectSelected()` loads agents via IPC
4. `project-detail-panel.handleProjectSelected()` loads file tree via IPC
5. User clicks agent card → `project-agent-dashboard` emits `agent-selected` event, switches to chat view
6. `chat-panel` loads and displays conversation, connects to IPC for messaging
7. User clicks back button → `chat-panel` emits `chat-back` event, returns to dashboard view

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
- **Tool calling** - AI agents can call custom tools during conversations (enabled via `formatToolDescriptions`)
- **File tagging** - Reference .txt and .md files from project folder as conversation context
- **Error handling** - Graceful timeout and error message display
- **Message management** - Clear chat with confirmation, automatic scroll to latest

**Chat UI Components:**
- Message container with automatic scrolling
- User and assistant message bubbles with different styling
- Loading indicator during streaming
- File tagging area with removable badges
- Autocomplete dropdown for @mention file selection
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Streaming toggle in chat header
- Back button to return to agent dashboard

**Message Flow:**
1. User enters message in `chat-panel` text area (optionally tags files via @mention)
2. `chat-panel` calls IPC method (`streamMessage` or `sendMessage`) with file paths
3. OpenAI client module (`openai-client.ts`) validates agent and API key
4. OpenAI client compiles messages: system prompt + tool descriptions + tagged file contents + conversation history + new message
5. OpenAI client calls OpenAI-compatible API with agent's model config
6. For tool-enabled agents, OpenAI client detects tool calls, executes them via worker processes, and makes follow-up API call
7. Response chunks/events sent back via IPC events (`chat-chunk`, `chat-complete`, `chat-error`)
8. `chat-panel` updates UI in real-time, saves completed messages to agent file via OpenAI client module

**API Integration:**
- Supports OpenAI and compatible APIs (via custom `baseURL`)
- Configurable model, temperature, maxTokens, topP per agent
- Request timeout: 60 seconds
- Server-Sent Events (SSE) for streaming responses

### File Tagging in Chat

The app allows users to tag .txt and .md files from the project folder to include them as context in AI conversations.

**File Tagging Features:**
- **@mention trigger** - Type `@` in chat input to open autocomplete dropdown
- **File filtering** - Type after `@` to filter files by name
- **Keyboard navigation** - Arrow keys to navigate, Enter to select, Escape to close
- **Visual feedback** - Blue tag badges show attached files with file icons
- **Easy removal** - X button on each tag or "Clear all" button
- **Session persistence** - Tagged files persist across messages in same conversation
- **Agent switching** - Tagged files cleared when switching agents

**File Tagging UI:**
- Autocomplete dropdown positioned above chat input
- File list shows all .txt and .md files from project (recursive, max 10 levels deep)
- Hidden files excluded by default
- File badges display file name and extension
- Hover effects on autocomplete options
- Selected file highlighted in autocomplete

**File Tagging Data Flow:**
1. User types `@` in chat input
2. `handleTextareaInput()` detects `@` and shows autocomplete
3. `loadAvailableFiles()` fetches all .txt/.md files via IPC
4. User selects file from dropdown (click or Enter key)
5. `selectFileForTagging()` adds file to `taggedFiles` array, removes `@` from input
6. When sending message, file paths passed to IPC
7. Main process reads file contents and includes as system messages
8. Tagged files persist for conversation until manually removed or agent switched

**File Content Inclusion:**
- Full file content included as system message with format: `[File: filename]\n{content}`
- Multiple files included as separate system messages
- File contents read at send time, not cached
- Errors reading files logged but don't block message sending
- No size limits on tagged files (per user requirements)

**File Tagging State (chat-panel.ts):**
- `taggedFiles` - Array of currently tagged files `{ name, path }`
- `availableFiles` - All .txt/.md files in project `{ name, path, extension }`
- `showAutocomplete` - Whether dropdown is visible
- `autocompleteQuery` - Current filter text after `@`
- `autocompleteIndex` - Selected index for keyboard navigation

**Security:**
- All file names escaped via `escapeHtml()` before rendering
- File paths in data attributes also escaped
- File system operations wrapped in try-catch
- Only .txt and .md files can be tagged (configurable)

### Project Detail Panel

The app includes a file browser panel that displays the structure of selected project folders.

**File Tree Features:**
- **Recursive directory tree** - Shows all files and folders in project hierarchy
- **Expand/collapse folders** - Click directory nodes to toggle visibility
- **Visual distinction** - Blue folder icons, gray file icons for easy identification
- **Hidden file filtering** - Automatically excludes files starting with '.'
- **Alphabetical sorting** - Directories first, then files, both sorted A-Z
- **16px indentation** - Visual hierarchy with proper nesting levels
- **Empty state handling** - Graceful handling for no project selected or empty folders
- **Panel toggle** - Collapse/expand with smooth transitions

**File Tree UI:**
- Hierarchical tree view with folder/file icons
- Chevron indicators for expandable directories
- Hover effects on tree nodes
- Item count display
- Responsive panel width (264px when expanded, 0px when collapsed)

**File Tree Data Flow:**
1. User selects project in `project-panel`
2. `project-selected` event forwarded to `project-detail-panel`
3. `project-detail-panel.handleProjectSelected()` calls `getFileTree()` IPC method
4. Project management module reads folder contents recursively via `buildFileTree()` helper
5. File tree returned with `FileTreeNode[]` array structure
6. Component renders tree recursively with `renderTreeNode()` method
7. User interacts with tree via click events to expand/collapse directories

**File Tree Implementation:**
- `buildFileTree(dirPath, options, currentDepth)` - Recursive helper in `src/main/project-management.ts`
- `isHidden(name)` - Filters files starting with '.'
- `listFilesRecursive(dirPath, options, currentDepth)` - Lists files for @mention tagging
- `renderTreeNode(node, depth)` - Recursive rendering with proper indentation
- `toggleDirectory(path)` - Manages expanded/collapsed state via `Set<string>`
- `escapeHtml(text)` - XSS prevention for all file/folder names
- Clone-and-replace pattern for event listeners to prevent duplicates

**Security:**
- All file names and folder names escaped via `escapeHtml()` to prevent XSS
- File system operations wrapped in try-catch for graceful error handling
- Permission errors logged as warnings, don't crash the app
- Hidden files filtered by default to reduce clutter

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
- All agent CRUD operations handled by `src/main/agent-management.ts` module

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
  - `Tool` interface - Custom tool definition with `name`, `description`, `code`, `parameters` (JSON Schema), `returns` (optional), `timeout`, `environment` ('node' | 'browser'), `enabled`, `createdAt`, and `updatedAt`
  - `ToolExecutionRequest` interface - Request for tool execution with `toolName`, `parameters`, and optional `tool` (full tool data)
  - `ToolExecutionResult` interface - Result from tool execution with `success`, `result`, `error`, and `executionTime`
  - `FileType` type - Discriminator union for file system nodes ('file' | 'directory')
  - `FileTreeNode` interface - Represents a node in the file tree with name, path, type, children (for directories), and expanded state
  - `FileTreeOptions` interface - Configuration for file tree traversal (maxDepth, excludeHidden, includeExtensions)
  - `FileReference` interface - Represents a file reference for @mention with name, path, and extension
  - `FileContent` interface - Represents file content with metadata (path, name, content, size, error)
  - `FileListOptions` interface - Configuration for file listing (extensions, maxDepth, excludeHidden)
  - `ElectronAPI` interface - Defines the exposed API methods from the preload script, including tool management methods and browser tool event handlers (`onBrowserToolExecution`, `sendBrowserToolResult`)

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

**Tool IPC Channels:**
- `tools:get` - Returns all stored tools
- `tools:add` - Adds a new tool (validates name, description, code, and parameters; validates code syntax)
- `tools:update` - Updates an existing tool (preserves createdAt, sets updatedAt)
- `tools:remove` - Removes a tool by name
- `tools:execute` - Executes a tool (routes to worker or renderer based on tool's environment setting)
- `tools:executeBrowser` - Event sent to renderer to execute browser-based tools
- `tools:browserResult` - Event sent from renderer with browser tool execution result

**Project Detail IPC Channels:**
- `project:getFileTree` - Gets file tree structure for a project folder (recursive, filters hidden files)

**File Reading IPC Channels:**
- `files:list` - Lists all .txt and .md files in a project folder (recursive, up to 10 levels deep)
- `files:readContents` - Reads multiple file contents at once (batch operation)

**Chat IPC Channels:**
- `chat:sendMessage` - Sends non-streaming message with optional file paths, returns full response
- `chat:streamMessage` - Initiates streaming message exchange with optional file paths
- `chat-chunk` - Event emitted for each response chunk during streaming (via `webContents.send()`)
- `chat-complete` - Event emitted when streaming completes successfully
- `chat-error` - Event emitted when streaming encounters an error

**Project Storage:**
- Projects are stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path` (absolute path), `name` (folder name), `addedAt` (timestamp)
- Projects persist across app restarts
- Storage helpers (`getProjectsPath()`, `loadProjects()`, `saveProjects()`), file tree helpers (`isHidden()`, `buildFileTree()`), file listing helpers (`listFilesRecursive()`), and IPC handlers are located in `src/main/project-management.ts`

**Agent Storage:**
- Agents are stored as individual JSON files in project folders: `agent-{sanitized-name}.json`
- Agent names are sanitized for filenames (lowercase, special chars removed, spaces to hyphens)
- Each agent file contains complete agent metadata including conversation history
- Storage helpers (`loadAgents()`, `saveAgent()`, `deleteAgent()`, `sanitizeAgentName()`, `getAgentFilePath()`) and IPC handlers are located in `src/main/agent-management.ts`

**API Key Storage:**
- API keys stored in `app.getPath('userData')/api-keys.json`
- Storage helpers (`getAPIKeysPath()`, `loadAPIKeys()`, `saveAPIKeys()`, `getAPIKeyByName()`) and IPC handlers are located in `src/main/apiKey-management.ts`
- Keys referenced by agents via `config.apiKeyRef` property name

**Tool Storage:**
- Tools stored in `app.getPath('userData')/tools.json`
- Each tool contains: `name`, `description`, `code`, `parameters` (JSON Schema), `returns` (optional), `timeout` (default 30000ms), `environment` ('node' or 'browser', default 'node'), `enabled` (default true), `createdAt`, and `updatedAt`
- Storage helpers (`getToolsPath()`, `loadTools()`, `saveTools()`, `getToolByName()`), JSON Schema validator (`validateJSONSchema()`), and IPC handlers are located in `src/main/tool-management.ts`
- Tools execute in different environments based on `environment` setting:
  - **Node.js tools**: Execute in isolated worker processes with access to Node.js APIs (fs, path, child_process, etc.)
  - **Browser tools**: Execute in renderer process with access to browser APIs (fetch, localStorage, DOM, etc.)

## Development Notes

### Event Listener Management
Web Components use a unique pattern to prevent duplicate event listeners: after rendering, buttons are cloned and replaced before attaching new listeners. This is visible in all panel components.

**Critical Implementation Detail:**
The clone-and-replace pattern is essential for any interactive elements that are re-rendered. Without this pattern, event listeners accumulate on old DOM elements and new elements may not have listeners attached. This pattern is especially important for:
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
In `src/main.ts:16-17`, development mode is detected via:
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
The OpenAI client module provides a complete OpenAI-compatible API client (`src/main/openai-client.ts`):
- **API Client Functions**:
  - `callOpenAICompatibleAPI()` - Makes non-streaming API requests
  - `streamOpenAICompatibleAPI()` - Makes streaming API requests with SSE parsing, detects tool calls during streaming
- **Tool Functions**:
  - `formatToolDescriptions()` - Formats available tools for inclusion in system prompt
  - `parseToolCalls()` - Parses tool call markers from AI responses
  - `executeToolInWorker()` - Executes tool code in isolated worker process for security
- **Chat IPC Handlers**:
  - `chat:sendMessage` - Handles non-streaming chat with tool support
  - `chat:streamMessage` - Handles streaming chat with tool support
- Automatic agent file updates after each message exchange
- 60-second timeout for API requests
- Support for custom base URLs and API key references
- File contents included as system messages with format: `[File: filename]\n{content}`
- Tool call detection during streaming stops chunk delivery to renderer, executes tools, then makes second API call with results

### Tool Worker Execution
The app supports dual execution environments for tools:

#### Node.js Tool Execution (Worker Process)
Node.js tools execute in isolated worker processes for security:
- **Worker File**: `src/tool-worker.ts` (built to `dist/tool-worker.js`)
- **Worker Path**: Resolved as `../tool-worker.js` from `openai-client.ts` (accounting for module location in `dist/main/`)
- **Execution Model**: Each tool execution spawns a fresh worker process via `child_process.fork()`
- **Timeout Handling**: Configurable timeout per tool (default 30 seconds), enforced by worker
- **Isolation**: Tool code runs in separate process, preventing crashes in main process
- **Communication**: Worker receives execution request via IPC, returns result or error
- **Lifecycle**: Worker exits after execution (single-use, no persistent state)
- **Available APIs**: Node.js APIs (fs, path, child_process, etc.)

**Worker Communication Protocol:**
- **Request**: `{ type: 'execute', code: string, parameters: any, timeout: number }`
- **Response**: `{ success: boolean, result?: any, error?: string, executionTime: number }`

#### Browser Tool Execution (Renderer Process)
Browser tools execute directly in the renderer process:
- **Executor Module**: `src/renderer/browser-tool-executor.ts`
- **Execution Model**: Tool code executed via `new Function()` in renderer context
- **Timeout Handling**: Configurable timeout per tool, enforced via Promise.race()
- **Communication**: Main process sends `tools:executeBrowser` event to renderer, renderer sends back `tools:browserResult` event
- **Available APIs**: Browser APIs (fetch, localStorage, sessionStorage, IndexedDB, DOM, etc.)
- **Use Cases**: HTTP requests, local storage manipulation, DOM operations, Web APIs

**Browser Tool Communication Protocol:**
- **Request (main → renderer)**: `{ code: string, parameters: any, timeout: number }` via `tools:executeBrowser`
- **Response (renderer → main)**: `{ success: boolean, result?: any, error?: string, executionTime: number }` via `tools:browserResult`

**Execution Routing:**
When `tools:execute` is invoked, the main process checks the tool's `environment` field:
- If `'browser'`: Routes to renderer process for browser execution
- If `'node'` (or missing, defaults to `'node'`): Routes to worker process for Node.js execution
- Main process sets up Promise-based listener for result (for browser tools) or executes directly (for Node.js tools)

#### Tool Environment UI/UX
The tools dialog provides visual indicators and controls for execution environment:

**Environment Selector:**
- Dropdown in tool creation/edit form with two options:
  - "Node.js (File system, child processes, etc.)"
  - "Browser (Fetch, localStorage, DOM, etc.)"
- Helper text explains execution context differences
- Default value is 'node' for backward compatibility

**Visual Badges:**
- Color-coded badges in tool list:
  - **Blue badge** labeled "Browser" for browser tools
  - **Purple badge** labeled "Node" for Node.js tools
  - **Green/Gray badge** for Enabled/Disabled status
- Environment displayed in tool metadata: "Environment: browser • Timeout: 30000ms • Created: ..."

**Testing Behavior:**
- Test dialog routes execution based on tool's environment setting:
  - Browser tools: Execute directly in renderer via `executeToolInBrowser()`
  - Node.js tools: Execute via main process IPC to worker
- Execution time displayed for both environments

### Streaming Implementation
Streaming responses use Server-Sent Events (SSE) parsing:
- Response chunks parsed line-by-line for `data: ` prefix
- JSON chunks extracted and accumulated
- Final accumulated content saved to agent history
- Real-time UI updates via IPC events sent to renderer
- Error handling for malformed chunks and network failures

### Main Process Module Organization
The main process code is organized into dedicated modules for better maintainability:
- `src/main.ts` - Core application setup, window creation, app lifecycle, and coordination of all IPC handler registrations
- `src/main/project-management.ts` - Project storage helpers, file tree helpers, file listing helpers, and project-related IPC handlers (CRUD operations, file tree, file reading)
- `src/main/agent-management.ts` - Agent storage helpers and IPC handlers (CRUD operations)
- `src/main/apiKey-management.ts` - API key storage helpers and IPC handlers (CRUD operations)
- `src/main/openai-client.ts` - OpenAI API client, tool functions, tool worker execution, and chat IPC handlers
- `src/main/tool-management.ts` - Tool storage helpers, JSON Schema validator, and tool IPC handlers (CRUD operations, execution routing based on environment, validation)
- `src/renderer/browser-tool-executor.ts` - Browser tool execution module for running tools in renderer context with access to browser APIs

**Module Dependencies:**
- `openai-client.ts` imports from: `agent-management.ts` (loadAgents, saveAgent), `apiKey-management.ts` (getAPIKeyByName), and `tool-management.ts` (loadTools, getToolByName, validateJSONSchema)
- `tool-management.ts` imports from: `openai-client.ts` (executeToolInWorker)
- `main.ts` imports from: `project-management.ts` (registerProjectIPCHandlers), `openai-client.ts` (registerOpenAIClientIPCHandlers), and `tool-management.ts` (registerToolIPCHandlers)

**Pattern for Creating New Modules:**
1. Create a new file in `src/main/` (e.g., `src/main/feature-name.ts`)
2. Export storage/helper functions and a `registerFeatureIPCHandlers()` function
3. Import and call the registration function in `src/main.ts` within `registerIPCHandlers()`
4. If the module needs functions from another module, import them directly from that module
5. Update CLAUDE.md to document the new module

## Testing

The project uses **Jest** with **ts-jest** for testing TypeScript code.

### Test Commands
- `npm test` - Run all tests once **with coverage report** (coverage table shown at end)
- `npm run test:no-coverage` - Run all tests once **without coverage** (faster, no report)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (same as `npm test`)
- `npm run test:verbose` - Run tests with verbose output

### Test Configuration
- **Config File**: `jest.config.js`
- **Setup File**: `jest.setup.ts` (runs before each test suite)
- **Environment**: Node.js (for main process tests)
- **Module System**: CommonJS (not ESM)
- **Test Pattern**: `**/__tests__/**/*.test.ts` or `**/?(*.)+(spec|test).ts`

### Module System and Mocking
The project uses **CommonJS mode**, not ESM (`"type": "module"` is NOT set in package.json). TypeScript compiles ESM-style imports to CommonJS with `esModuleInterop: true`.

**Critical Mocking Pattern:**
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

### Global Mocks (jest.setup.ts)
The following modules are mocked globally in `jest.setup.ts`:

**`fs` Module:**
- In-memory file store for testing file operations
- Mocked functions: `existsSync`, `readFileSync`, `writeFileSync`, `readdirSync`, `statSync`, `unlinkSync`, `mkdirSync`
- Automatically cleared before each test via `beforeEach()` hook
- Includes `__clearMockFsFiles()` global function for manual cleanup

**`path` Module:**
- Simple path operations for consistent test paths
- Mocked functions: `join`, `basename`, `dirname`, `extname`, `relative`, `resolve`, `normalize`, `isAbsolute`, `parse`, `format`
- Uses Unix-style paths (`/`) regardless of platform

**`electron` Module:**
- Mocked Electron APIs for main process testing
- Mocked properties: `app.getPath()`, `ipcMain`, `ipcRenderer`, `dialog`, `BrowserWindow`
- Returns mock paths like `/mock/userdata` for `app.getPath('userData')`

### Test Helpers
Located in `src/__tests__/helpers/`:

**`file-system.ts`:**
- `setupMockFS(mockFiles)` - Populates the global fs mock with initial test data
- `clearMockFiles()` - Clears the local test file cache
- `addMockFile(path, content)` - Adds a file to the mock during a test
- `getMockFile(path)` - Reads a file from the mock during a test

**`mocks.ts`:**
- `createMockProject(overrides)` - Creates a mock Project object
- `createMockAgent(overrides)` - Creates a mock Agent object
- `createMockFileSystem()` - Creates an in-memory file system object
- `createTestProjectStructure(path, agents)` - Creates mock files for a project with agents

### Test Structure
Tests are organized in `src/__tests__/` by feature:
- `src/__tests__/project-management/` - Project storage, file tree, file listing, and IPC handler tests
  - `projects.test.ts` - Storage helper tests (getProjectsPath, loadProjects, saveProjects)
  - `file-tree.test.ts` - File tree helper tests (isHidden, buildFileTree)
  - `file-listing.test.ts` - File listing helper tests (listFilesRecursive)
  - `ipc-handlers.test.ts` - IPC handler tests (projects:add, projects:remove, project:getFileTree, files:list, files:readContents)
- `src/__tests__/agent-management/` - Agent CRUD operation tests
- `src/__tests__/helpers/` - Shared test utilities and mocks

### Example Test
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

### Important Notes

**No @jest/globals Import:**
- The project uses CommonJS mode, NOT ESM
- Do NOT use `import { jest } from '@jest/globals'` - this is only for ESM mode
- Jest's global `jest`, `describe`, `it`, `expect` are available automatically

**Mock Cleanup:**
- Global fs mock is automatically cleared before each test via `beforeEach()` in jest.setup.ts
- Test-specific mocks should be cleared in `afterEach()` or `afterAll()`
- Use `jest.clearAllMocks()` to reset mock call counts
- Use `jest.restoreAllMocks()` to restore original implementations

**Test Isolation:**
- Each test should be independent and not rely on state from other tests
- Use `setupMockFS({})` to create a clean file system for each test
- Always call `cleanup()` from `setupMockFS()` in `afterEach()` if needed

