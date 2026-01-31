# Architecture

## Electron Process Structure

The app follows standard Electron architecture:

### Main Process (`src/main.ts`)
- Creates BrowserWindow
- Handles app lifecycle
- Coordinates all IPC handler registrations

### Module Organization
The main process is organized into dedicated modules:

**`src/main/project-management.ts`**
- Project CRUD operations
- Storage helpers: `getProjectsPath`, `loadProjects`, `saveProjects`
- File tree helpers: `isHidden`, `buildFileTree`
- File listing helpers: `listFilesRecursive`
- IPC handler registration: `registerProjectIPCHandlers`

**`src/main/agent-management.ts`**
- Agent CRUD operations
- Storage helpers: `loadAgents`, `saveAgent`, `deleteAgent`, `sanitizeAgentName`, `getAgentFilePath`
- IPC handler registration: `registerAgentIPCHandlers`

**`src/main/app-management.ts`**
- App CRUD operations (for App-type agents)
- Storage helpers: `loadApp`, `saveApp`, `deleteAppFile`, `sanitizeAppName`, `getAppFilePath`, `createApp`
- IPC handler registration: `registerAppIPCHandlers`
- App execution: `apps:executeMain` for running main process code
- Data persistence: `apps:updateData` for updating app.data field

**`src/main/provider-management.ts`**
- LLM provider CRUD operations
- Storage helpers: `getProvidersPath`, `loadProviders`, `saveProviders`, `getProviderById`
- Validation: `validateProvider` (type-specific validation)
- Default URLs: `getDefaultBaseURL` (returns default endpoints per provider type)
- IPC handler registration: `registerProviderIPCHandlers`

**`src/main/llm/` - LLM Streaming Module**
- `index.ts` - Main routing interface with `streamLLM()` function and `StreamLLMOptions` interface
  - Helper functions: `buildFileContentMessages()`, `buildAllMessages()`
- `openai.ts` - OpenAI-compatible streaming with native tool calling and tool call iteration
  - Complete flow: `streamOpenAI()` - saves user/assistant messages, handles tool call iteration loop (max 10 rounds)
  - Single streaming: `streamOpenAISingle()` - handles SSE parsing, tool_calls extraction
  - Tool execution: `executeToolCalls()` - validates and executes tools, sends IPC events
  - Tool helpers: `convertToolToOpenAIFormat()`, `handleToolSuccess()`, `handleToolError()`
- `glm.ts` - GLM (Zhipu AI) streaming with native tool calling
  - Same structure as openai.ts: `streamGLM()`, `streamGLMSingle()`, `executeToolCalls()`
  - Uses OpenAI-compatible tool calling format (tools array, tool_calls in delta, tool_call_id for results)

**`src/main/llm/index.ts`**
- LLM streaming router and tool execution routing
- `streamLLM()` - Routes to provider-specific streaming implementations
- `executeToolWithRouting()` - Routes tools to Node.js worker or browser based on environment

**`src/main/chat-agent-management.ts`**
- Chat agent logic (tools + files)
- System prompt generation: `generateChatAgentSystemPrompt()`
- IPC handlers: `chat-agent:streamMessage`, `chat-agent:clearHistory`
- LLM handlers manage conversation history (saves user/assistant messages)

**`src/main/app-agent-management.ts`**
- App agent logic (files only, no tools)
- System prompt generation: `generateAppAgentSystemPrompt()` (system prompt only)
- IPC handlers: `app-agent:streamMessage`, `app-agent:clearHistory`
- LLM handlers manage conversation history (saves user/assistant messages)

**`src/main/tool-management.ts`**
- Tool CRUD operations
- Storage helpers: `getToolsPath`, `loadTools`, `saveTools`, `getToolByName`
- JSON Schema validator: `validateJSONSchema`
- IPC handlers: CRUD operations, execution routing based on environment, validation

**`src/renderer/browser-tool-executor.ts`**
- Browser tool execution module
- Runs tools in renderer context with access to browser APIs

### Module Dependencies
- `llm/index.ts` imports from: `llm/openai.ts`, `llm/glm.ts`
- `llm/openai.ts` imports from: `provider-management.ts`, `tool-management.ts`, `llm/index.ts` (executeToolWithRouting)
- `llm/glm.ts` imports from: `provider-management.ts`, `tool-management.ts`, `llm/index.ts` (executeToolWithRouting)
- `chat-agent-management.ts` imports from: `llm/index.ts` (streamLLM), `agent-management.ts`, `provider-management.ts`, `model-config-management.ts`, `tool-management.ts`
- `app-agent-management.ts` imports from: `llm/index.ts` (streamLLM), `agent-management.ts`, `provider-management.ts`, `model-config-management.ts`
- `main.ts` imports from: `project-management.ts`, `provider-management.ts`, `model-config-management.ts`, `chat-agent-management.ts`, `app-agent-management.ts`, `tool-management.ts`

### Pattern for Creating New Modules
1. Create a new file in `src/main/` (e.g., `src/main/feature-name.ts`)
2. Export storage/helper functions and a `registerFeatureIPCHandlers()` function
3. Import and call the registration function in `src/main.ts` within `registerIPCHandlers()`
4. If the module needs functions from another module, import them directly from that module
5. Update CLAUDE.md to document the new module

### Preload Script (`src/preload.ts`)
- Bridges main and renderer via contextBridge
- Exposes `window.electronAPI` with:
  - `platform` - Current platform (darwin/win32/linux)
  - `openFolderDialog()` - Opens native folder picker dialog
  - `getProjects()`, `addProject(path)`, `removeProject(path)` - Project operations
  - `getAgents(projectPath)`, `addAgent(...)`, `removeAgent(...)`, `updateAgent(...)` - Agent operations
  - `getApp(projectPath, agentName)`, `saveApp(...)`, `deleteApp(...)` - App operations
  - `executeAppMain(...)` - Execute main process code from app
  - `updateAppData(...)` - Update app data storage
  - `getProviders()`, `addProvider(...)`, `updateProvider(id, ...)`, `removeProvider(id)`, `getProviderById(id)` - Provider operations
  - `getTools()`, `addTool(...)`, `updateTool(...)`, `removeTool(toolName)` - Tool operations
  - `executeTool(request)` - Executes a tool (routes based on environment)
  - `onBrowserToolExecution(callback)` - Listens for browser tool execution requests
  - `sendBrowserToolResult(result)` - Sends browser tool execution result back
  - `getFileTree(projectPath, options)` - Gets file tree structure
  - `listProjectFiles(projectPath, options)` - Lists .txt and .md files
  - `readFileContents(filePaths)` - Reads multiple file contents
  - `saveMessageToFile(projectPath, content)` - Saves message content to a file in the project folder
  - `streamChatAgentMessage(projectPath, agentName, message, filePaths, onChunk, onComplete, onError)` - Streams chat agent message
  - `streamAppAgentMessage(projectPath, agentName, message, filePaths, onChunk, onComplete, onError)` - Streams app agent message

### Renderer Process (`src/renderer.ts`)
- Web Components UI, runs in browser context
- Includes browser tool execution handler
- Listens for `tools:executeBrowser` events and executes tools via `browser-tool-executor.ts`

## Build System

The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload) and `dist-renderer/` (renderer)

## UI Architecture: Web Components

The renderer uses vanilla JavaScript Web Components (not Vue/React). Each component is a TypeScript class extending `HTMLElement`:

**Components:**
- `app-container` (`src/components/app-container.ts`) - Root layout container, manages panel visibility and toggle buttons, forwards events between components, manages provider dialog, routes between chat-panel and app-panel based on agent type
- `project-panel` (`src/components/project-panel.ts`) - Collapsible left sidebar (264px wide) that manages local folder projects
- `project-agent-dashboard` (`src/components/project-agent-dashboard.ts`) - Center content area that displays agents in a grid, handles dashboard/chat view switching
- `conversation-panel` (`src/components/conversation-panel.ts`) - Reusable chat interface with streaming, tool call indicators, and optional file tagging
- `assistant-message` (`src/components/conversation/assistant-message.ts`) - Web Component for rendering assistant messages with markdown, reasoning display, save/copy buttons; uses factory pattern for handler injection
- `chat-panel` (`src/components/chat-panel.ts`) - Interactive chat interface with streaming support, wraps conversation-panel for chat agents, provides assistant message factory with save handler
- `app-panel` (`src/components/app-panel.ts`) - Split-panel interface for App-type agents with chat (left 25%) and live app preview (right 75%), provides custom renderers for app-specific message rendering
- `project-detail-panel` (`src/components/project-detail-panel.ts`) - Collapsible right sidebar (264px wide) that displays recursive file tree
- `agent-form-dialog` (`src/components/agent-form-dialog.ts`) - Modal dialog for creating and editing agents
- `provider-dialog` (`src/components/provider-dialog.ts`) - Modal dialog for managing LLM providers
- `tools-dialog` (`src/components/tools-dialog.ts`) - Modal dialog for managing custom tools with add/edit/delete/test functionality
- `tool-test-dialog` (`src/components/tool-test-dialog.ts`) - Modal dialog for testing tool execution

### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`, `chat-back`, `provider-dialog-close`)

### Event Flow
1. User clicks project in `project-panel` → emits `project-selected` event (bubbles, composed)
2. `app-container` catches event → forwards to both `project-agent-dashboard` and `project-detail-panel` with `bubbles: false` to prevent infinite loop
3. `project-agent-dashboard.handleProjectSelected()` loads agents via IPC
4. `project-detail-panel.handleProjectSelected()` loads file tree via IPC
5. User clicks agent card → `project-agent-dashboard` emits `agent-selected` event, switches to chat view
6. `chat-panel` or `app-panel` (based on agent type) loads and displays conversation
7. **Chat message flow (event-driven)**:
   - User sends message in `conversation-panel` → dispatches `message-sent` event (bubbles, composed) with message details
   - Parent component (`chat-panel` or `app-panel`) listens for `message-sent` → calls appropriate IPC (`chat-agent:*` or `app-agent:*`)
   - **For chat agents with tools**: Main process emits `chat-agent:toolCall` events during tool execution → parent component calls `handleToolCallStart()`, `handleToolCallComplete()`, or `handleToolCallFailed()` on conversation panel
   - Main process handles streaming → calls back via `handleStreamChunk()`, `handleStreamComplete()`, or `handleStreamError()`
   - Parent component listens for `stream-complete` event for additional processing (e.g., `app-panel` parses app code)
8. User clicks back button → parent panel emits `chat-back` event, returns to dashboard view

### Dashboard/Chat View Switching
The `project-agent-dashboard` component has two display modes:
- **Dashboard mode** (default): Grid of agent cards with add/edit/delete actions
- **Chat mode**: Shows the `chat-panel` component for the selected agent

When an agent is selected via the `agent-selected` event, the dashboard hides the agent grid and shows the chat panel. The `chat-back` event reverses this.

## IPC Communication

The app uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes.

### Project IPC Channels
- `dialog:openFolder` - Opens native folder picker dialog, returns folder path or null
- `projects:get` - Returns all saved projects from storage
- `projects:add` - Adds a new project (prevents duplicates)
- `projects:remove` - Removes a project by path

### Agent IPC Channels
- `agents:get` - Returns all agents for a project (reads agent-*.json files from project folder)
- `agents:add` - Adds a new agent to a project (validates and saves agent-{name}.json)
- `agents:remove` - Removes an agent from a project (deletes agent-{name}.json)
- `agents:update` - Updates an existing agent (validates, handles name changes)

### Provider IPC Channels
- `providers:get` - Returns all stored providers
- `providers:add` - Adds a new provider (validates and saves to providers.json)
- `providers:update` - Updates an existing provider (preserves createdAt, sets updatedAt)
- `providers:remove` - Removes a provider by ID
- `providers:getById` - Gets a single provider by ID

### Tool IPC Channels
- `tools:get` - Returns all stored tools
- `tools:add` - Adds a new tool (validates name, description, code, and parameters; validates code syntax)
- `tools:update` - Updates an existing tool (preserves createdAt, sets updatedAt)
- `tools:remove` - Removes a tool by name
- `tools:execute` - Executes a tool (routes to worker or renderer based on tool's environment setting)
- `tools:executeBrowser` - Event sent to renderer to execute browser-based tools
- `tools:browserResult` - Event sent from renderer with browser tool execution result

### Project Detail IPC Channels
- `project:getFileTree` - Gets file tree structure for a project folder (recursive, filters hidden files)

### File Reading IPC Channels
- `files:list` - Lists all .txt and .md files in a project folder (recursive, up to 10 levels deep)
- `files:readContents` - Reads multiple file contents at once (batch operation)

### Chat IPC Channels

**Chat Agent (with tools):**
- `chat-agent:streamMessage` - Initiates streaming message with tool calling + file context
- `chat-agent:toolCall` - Real-time tool call status updates (one-way IPC from main to renderer, sent during tool execution)
- `chat-agent:clearHistory` - Clears conversation history for a chat agent

**App Agent (files only, no tools):**
- `app-agent:streamMessage` - Initiates streaming message with file context only
- `app-agent:clearHistory` - Clears conversation history for an app agent

**Streaming Events (one-way IPC from main to renderer):**
- `chat-chunk` - Content chunk during streaming (sent by both chat-agent and app-agent)
- `chat-reasoning` - Reasoning/thinking chunk during streaming (GLM only, sent by both chat-agent and app-agent)
- `chat-complete` - Signals streaming completion
- `chat-error` - Signals streaming error with error message

**Note:** The old `chat:sendMessage` and `chat:streamMessage` channels have been removed in favor of the more specific `chat-agent:*` and `app-agent:*` channels.

## Storage

### Project Storage
- Projects stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path` (absolute path), `name` (folder name), `addedAt` (timestamp)
- Projects persist across app restarts
- Storage helpers and IPC handlers in `src/main/project-management.ts`

### Agent Storage
- Agents stored as individual JSON files in project folders: `agent-{sanitized-name}.json`
- Agent names sanitized for filenames (lowercase, special chars removed, spaces to hyphens)
- Each agent file contains complete agent metadata including conversation history
- Storage helpers and IPC handlers in `src/main/agent-management.ts`

### Provider Storage
- LLM providers stored in `app.getPath('userData')/providers.json`
- Each provider contains: `id` (unique identifier), `type` (provider type discriminator), `name` (display name), `apiKey` (secret), `baseURL` (optional, overrides default), `createdAt` (timestamp), `updatedAt` (optional timestamp)
- Agents reference providers by ID via `config.providerId` property
- Storage helpers, validation, and IPC handlers in `src/main/provider-management.ts`

### Tool Storage
- Tools stored in `app.getPath('userData')/tools.json`
- Each tool contains: `name`, `description`, `code`, `parameters` (JSON Schema), `returns` (optional), `timeout` (default 30000ms), `environment` ('node' or 'browser', default 'node'), `enabled` (default true), `createdAt`, `updatedAt`
- Storage helpers, JSON Schema validator, and IPC handlers in `src/main/tool-management.ts`
- Tools execute in different environments based on `environment` setting:
  - **Node.js tools**: Execute in isolated worker processes with access to Node.js APIs
  - **Browser tools**: Execute in renderer process with access to browser APIs

## Type Definitions

Global types defined in `src/global.d.ts`:

- `Project` - Local folder project with `path`, `name`, and `addedAt` properties
- `Agent` - AI agent with full metadata including conversation history (stored as flexible `any[]` to support different message formats)
- `AgentConfig` - Model configuration (modelId, providerId, model @deprecated, temperature @deprecated, maxTokens @deprecated, topP @deprecated)
- `AgentPrompts` - System and user prompts
- `AgentSettings` - Flexible settings object
- `LLMProviderType` - Union type for provider types ('openai' | 'glm' | 'azure' | 'custom')
- `LLMProvider` - LLM provider storage (id, type, name, apiKey, baseURL?, createdAt, updatedAt?)
- `ModelConfig` - Model configuration for reusing model settings (id, name, model, type as LLMProviderType, temperature, maxTokens, topP, extra, createdAt, updatedAt)
- `Tool` - Custom tool definition (name, description, code, parameters, returns, timeout, environment, enabled, createdAt, updatedAt)
- `ToolExecutionRequest` - Request for tool execution (toolName, parameters, optional tool)
- `ToolExecutionResult` - Result from tool execution (success, result, error, executionTime)
- `ToolCallEvent` - Tool call event for IPC communication (toolName, parameters, status, result, executionTime, error)
- `FileType` - Discriminator union for file system nodes ('file' | 'directory')
- `FileTreeNode` - Node in the file tree (name, path, type, children, expanded)
- `FileTreeOptions` - Configuration for file tree traversal (maxDepth, excludeHidden, includeExtensions)
- `FileReference` - File reference for @mention (name, path, extension)
- `FileContent` - File content with metadata (path, name, content, size, error)
- `FileListOptions` - Configuration for file listing (extensions, maxDepth, excludeHidden)
- `ElectronAPI` - Exposed API methods from preload script

**Component-Specific Types:**

Some UI components define their own types locally for better encapsulation:
- `conversation-panel.ts` defines `ChatMessage` and `ToolCallData` interfaces for UI display (exported for testing)

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root
