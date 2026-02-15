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

### Feature Modules

**`src/project/`** - Project Management
- `main/project-management.ts` - Project CRUD operations
  - Storage helpers: `getProjectsPath`, `loadProjects`, `saveProjects`
  - File tree helpers: `isHidden`, `buildFileTree`
  - File listing helpers: `listFilesRecursive`
  - IPC handler registration: `registerProjectIPCHandlers`

**`src/agent/`** - Agent System
- `main/agent-management.ts` - Agent CRUD operations
  - Storage helpers: `loadAgents`, `saveAgent`, `deleteAgent`, `sanitizeAgentName`, `getAgentFilePath`
  - IPC handler registration: `registerAgentIPCHandlers`
- `main/agent-template-management.ts` - Agent template CRUD, validation, storage
- `main/chat-agent-management.ts` - Chat agent logic (tools + files)
  - System prompt generation: `generateChatAgentSystemPrompt()`
  - IPC handlers: `chat-agent:streamMessage`, `chat-agent:clearHistory`
- `main/app-agent-management.ts` - App agent logic (files only, no tools)
  - System prompt generation: `generateAppAgentSystemPrompt()`
  - IPC handlers: `app-agent:streamMessage`, `app-agent:clearHistory`

**`src/llm/`** - LLM Provider System
- `main/provider-management.ts` - LLM provider CRUD operations
  - Storage helpers: `getProvidersPath`, `loadProviders`, `saveProviders`, `getProviderById`
  - Validation: `validateProvider` (type-specific validation)
  - Default URLs: `getDefaultBaseURL` (returns default endpoints per provider type)
  - IPC handler registration: `registerProviderIPCHandlers`
- `main/model-config-management.ts` - Model configuration CRUD, validation, storage
- `main/streaming/` - LLM Streaming Module
  - `index.ts` - Main routing interface with `streamLLM()` function, `executeToolWithRouting()` for tool execution routing
  - `openai.ts` - OpenAI-compatible streaming with native tool calling
  - `glm.ts` - GLM (Zhipu AI) streaming with native tool calling

**`src/tools/`** - Tool System
- `main/tool-management.ts` - Tool CRUD operations (custom JavaScript tools + MCP tools)
  - Storage helpers: `getToolsPath`, `loadCustomTools`, `discoverMCPTools`, `loadTools`, `saveTools`
  - JSON Schema validator: `validateJSONSchema`
  - IPC handlers: CRUD operations, execution routing, validation
  - MCP tools integration: `initializeMCPServers()`
- `main/tool-worker-executor.ts` - Tool execution in isolated worker processes
- `main/mcp-client.ts` - MCP client implementation for server connections
- `main/mcp-storage.ts` - MCP server configuration storage and management
- `tool-worker.ts` - Worker process entry point for tool execution
- `browser/browser-tool-executor.ts` - Browser tool execution in renderer context

**`src/settings/`** - Application Settings
- `main/settings-management.ts` - Settings CRUD operations
  - Storage helpers: `getSettingsPath`, `loadSettings`, `saveSettings`, `updateSettingsFields`
  - IPC handler registration: `registerSettingsIPCHandlers`

**`src/notepad/`** - Quick Notepad
- `main/notepad-management.ts` - Notepad CRUD operations
- `main/notepad-window.ts` - Notepad window lifecycle, global shortcut registration
- `renderer.ts` - Notepad window renderer entry

**`src/quick-ai/`** - Quick AI Conversation
- `main/quick-ai-management.ts` - Quick AI conversation management
- `main/quick-ai-window.ts` - Quick AI window lifecycle, global shortcut registration
- `renderer.ts` - Quick AI window renderer entry

**`src/snippets/`** - Snippets Manager
- `main/snippet-management.ts` - Snippet CRUD operations
- `main/snippet-window.ts` - Snippet window lifecycle, global shortcut registration
- `renderer.ts` - Snippet window renderer entry

**`src/clipboard-history/`** - Clipboard History
- `main/clipboard-history-management.ts` - Clipboard history CRUD operations
- `main/clipboard-history-window.ts` - Clipboard history window lifecycle, global shortcut registration
- `main/clipboard-watcher.ts` - Clipboard monitoring with content hash comparison
- `renderer.ts` - Clipboard history window renderer entry

**`src/conversation/`** - Shared Conversation System
- `components/` - Reusable conversation UI components
- `transformers/` - Message format transformers for different providers

**`src/core/`** - Core Application Infrastructure
- `app-container.ts` - Root layout container
- `project-agent-dashboard.ts` - Agent grid display
- `types/electron-api.d.ts` - Electron API type definitions

### Module Dependencies
- `llm/main/streaming/index.ts` imports from: `streaming/openai.ts`, `streaming/glm.ts`, `tools/main/tool-management.ts`, `tools/main/mcp-client.ts`
- `agent/main/chat-agent-management.ts` imports from: `llm/main/streaming`, `agent/main/agent-management.ts`, `llm/main/provider-management.ts`, `tools/main/tool-management.ts`
- `agent/main/app-agent-management.ts` imports from: `llm/main/streaming`, `agent/main/agent-management.ts`, `llm/main/provider-management.ts`
- `notepad/main/notepad-management.ts` imports from: `settings/main/settings-management.ts`
- `quick-ai/main/quick-ai-management.ts` imports from: `llm/main/streaming`, `settings/main/settings-management.ts`, `llm/main/provider-management.ts`
- `main.ts` imports from all feature main modules

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

### Preload Module Organization (by feature)

**`src/project/preload/index.ts`**
- Functions: `openFolderDialog`, `getProjects`, `addProject`, `removeProject`, `getFileTree`, `listProjectFiles`, `readFileContents`, `saveMessageToFile`, `onProjectFileUpdated`

**`src/agent/preload/agent-management.ts`**
- Functions: `getAgents`, `addAgent`, `removeAgent`, `updateAgent`, `clearChatAgentHistory`, `streamChatAgentMessage`, `clearAppAgentHistory`, `streamAppAgentMessage`, `onToolCallEvent`

**`src/llm/preload/index.ts`**
- Provider functions: `getProviders`, `addProvider`, `updateProvider`, `removeProvider`, `getProviderById`
- Model config functions: `getModelConfigs`, `addModelConfig`, `updateModelConfig`, `removeModelConfig`, `getModelConfigById`

**`src/tools/preload/index.ts`**
- Functions: `getTools`, `addTool`, `updateTool`, `removeTool`, `executeTool`, `onBrowserToolExecution`, `sendBrowserToolResult`

**`src/settings/preload/index.ts`**
- Functions: `getSettings`, `updateSettings`

### Renderer Process (`src/renderer.ts`)
- Web Components UI, runs in browser context
- Imports components from feature directories
- Includes browser tool execution handler

### Renderer API Layer (by feature)

Renderer-safe API modules that wrap `window.electronAPI`:

- `src/project/api/index.ts` - `getProjectManagementAPI()` returns `ProjectManagementAPI`
- `src/agent/api/index.ts` - `getAgentManagementAPI()` returns `AgentManagementAPI`
- `src/llm/api/index.ts` - `getProviderManagementAPI()` returns `ProviderManagementAPI`
- `src/tools/api/index.ts` - `getToolManagementAPI()` returns `ToolManagementAPI`
- `src/settings/api/index.ts` - `getSettingsManagementAPI()` returns `SettingsManagementAPI`
- `src/notepad/api/index.ts` - `getNotepadManagementAPI()` returns `NotepadManagementAPI`
- `src/quick-ai/api/index.ts` - `getQuickAIManagementAPI()` returns `QuickAIManagementAPI`
- `src/snippets/api/index.ts` - `getSnippetManagementAPI()` returns `SnippetManagementAPI`
- `src/clipboard-history/api/index.ts` - `getClipboardHistoryManagementAPI()` returns `ClipboardHistoryManagementAPI`

**Benefits of the API Layer:**
- Type safety through interfaces
- Encapsulation of `window.electronAPI` access
- Easier to mock for testing
- Consistent API patterns across renderer components
- Prevents Electron APIs from being bundled into renderer code

## Build System

The project uses **Vite** as the sole build tool (`vite.config.mjs`):

- `vite-plugin-electron` - Bundles main process and preload script
- `vite-plugin-electron-renderer` - Handles renderer process
- Outputs to `dist/` (main/preload/tool-worker) and `dist-renderer/` (renderer)

## UI Architecture: Web Components

The renderer uses vanilla JavaScript Web Components. Each component is a TypeScript class extending `HTMLElement`:

**Components (by feature):**

- `src/core/app-container.ts` - Root layout container
- `src/core/project-agent-dashboard.ts` - Agent grid display
- `src/project/components/project-panel.ts` - Collapsible left sidebar
- `src/project/components/project-detail-panel.ts` - Collapsible right sidebar
- `src/conversation/components/conversation-panel.ts` - Reusable chat interface
- `src/conversation/components/user-message.ts` - User messages
- `src/conversation/components/assistant-message.ts` - Assistant messages with markdown
- `src/conversation/components/tool-call-message.ts` - Tool call messages
- `src/conversation/components/app-code-message.ts` - App agent messages
- `src/agent/components/chat-panel.ts` - Chat sidebar interface
- `src/agent/components/app-panel.ts` - App agent panel with preview
- `src/agent/components/agent-form-dialog.ts` - Agent creation/editing dialog
- `src/agent/components/agent-template-dialog.ts` - Agent template management
- `src/llm/components/provider-dialog.ts` - LLM provider management
- `src/llm/components/model-config-dialog.ts` - Model configuration management
- `src/tools/components/tools-dialog.ts` - Tool management with testing
- `src/tools/components/tool-test-dialog.ts` - Tool execution testing
- `src/settings/components/settings-dialog.ts` - App settings management
- `src/notepad/components/notepad-window.ts` - Standalone notepad window
- `src/quick-ai/components/quick-ai-window.ts` - Standalone Quick AI window
- `src/snippets/components/snippet-window.ts` - Standalone snippet window
- `src/clipboard-history/components/clipboard-history-window.ts` - Standalone clipboard history window

### Component Patterns
All Web Components follow this pattern:
1. `connectedCallback()` - Called when element is added to DOM, calls `render()` and `attachEventListeners()`
2. `render()` - Sets `innerHTML` with Tailwind classes, must re-attach listeners after render
3. `attachEventListeners()` - Clones and replaces DOM nodes to prevent duplicate listeners
4. Public methods for external control (e.g., `expand()`, `collapse()`, `getValue()`, `show()`, `hide()`)
5. Custom events for parent communication (e.g., `panel-toggle`, `project-selected`, `agent-selected`, `chat-back`)

### Event Flow
1. User clicks project in `project-panel` → emits `project-selected` event
2. `app-container` catches event → forwards to `project-agent-dashboard` and `project-detail-panel`
3. `project-agent-dashboard.handleProjectSelected()` loads agents via IPC
4. `project-detail-panel.handleProjectSelected()` loads file tree via IPC
5. User clicks agent card → `project-agent-dashboard` emits `agent-selected` event
6. `chat-panel` or `app-panel` (based on agent type) loads and displays conversation
7. User sends message → streaming response from LLM
8. User clicks back button → returns to dashboard view

## IPC Communication

The app uses Electron's IPC for secure communication between main and renderer processes.

### Project IPC Channels
- `dialog:openFolder` - Opens native folder picker dialog
- `projects:get` - Returns all saved projects
- `projects:add` - Adds a new project
- `projects:remove` - Removes a project

### Agent IPC Channels
- `agents:get` - Returns all agents for a project
- `agents:add` - Adds a new agent
- `agents:remove` - Removes an agent
- `agents:update` - Updates an existing agent

### Provider IPC Channels
- `providers:get` - Returns all stored providers
- `providers:add` - Adds a new provider
- `providers:update` - Updates an existing provider
- `providers:remove` - Removes a provider
- `providers:getById` - Gets a single provider by ID

### Settings IPC Channels
- `settings:get` - Returns all settings
- `settings:update` - Updates settings

### Tool IPC Channels
- `tools:get` - Returns all stored tools
- `tools:add` - Adds a new tool
- `tools:update` - Updates an existing tool
- `tools:remove` - Removes a tool
- `tools:execute` - Executes a tool
- `tools:executeBrowser` - Event sent to renderer for browser-based tools
- `tools:browserResult` - Event sent from renderer with browser tool result
- `mcp:servers:*` - MCP server management
- `mcp:tools:*` - MCP tool discovery

### Chat IPC Channels
- `chat-agent:streamMessage` - Initiates streaming message with tool calling
- `chat-agent:toolCall` - Real-time tool call status updates
- `chat-agent:clearHistory` - Clears conversation history
- `app-agent:streamMessage` - Initiates streaming message for app agents
- `app-agent:clearHistory` - Clears app agent history

### Quick AI IPC Channels
- `quick-ai:streamMessage` - Initiates streaming message
- `quick-ai:clearHistory` - Clears conversation history
- `quick-ai:validateSettings` - Validates settings
- `quick-ai:windowShown` - Window shown event

### Streaming Events
- `chat-chunk` - Content chunk during streaming
- `chat-reasoning` - Reasoning chunk during streaming
- `chat-complete` - Signals streaming completion
- `chat-error` - Signals streaming error

## Storage

### Project Storage
- Projects stored as JSON in `app.getPath('userData')/projects.json`
- Each project contains: `path`, `name`, `addedAt`

### Agent Storage
- Agents stored as JSON files in project folders: `agent-{sanitized-name}.json`
- Agent names sanitized for filenames

### Provider Storage
- LLM providers stored in `app.getPath('userData')/providers.json`
- Each provider contains: `id`, `type`, `name`, `apiKey`, `baseURL`, `createdAt`, `updatedAt`

### Tool Storage
- Tools stored in `app.getPath('userData')/tools.json`
- Contains both custom tools and MCP server configurations

### MCP Storage
- MCP servers stored within `tools.json` under `mcpServers` key

## Type Definitions

Type definitions are organized by feature in `types/` subdirectories:

### Core Types (`src/core/types/electron-api.d.ts`)
- `ElectronAPI` interface for contextBridge exposure

### Project Types (`src/project/types/`)
- `Project`, `FileTreeNode`, `FileReference`, `FileContent`, `ProjectManagementAPI`

### Agent Types (`src/agent/types/`)
- `Agent`, `AgentConfig`, `AgentPrompts`, `AgentSettings`, `AgentManagementAPI`
- `AgentTemplate`, `AgentTemplateManagementAPI`

### LLM Types (`src/llm/types/`)
- `LLMProvider`, `LLMProviderType`, `ModelConfig`, `ProviderManagementAPI`

### Tool Types (`src/tools/types/`)
- `Tool`, `MCPServer`, `MCPTool`, `ToolExecutionRequest`, `ToolExecutionResult`, `ToolCallEvent`, `JSONSchema`, `ToolManagementAPI`

### Settings Types (`src/settings/types/`)
- `AppSettings`, `SettingsManagementAPI`

### Feature-specific Types
- `src/notepad/types/` - `NotepadFile`, `NotepadManagementAPI`
- `src/quick-ai/types/` - `QuickAISettingsValidation`, `QuickAIManagementAPI`
- `src/snippets/types/` - `SnippetFile`, `SnippetManagementAPI`
- `src/clipboard-history/types/` - `ClipboardHistoryItem`, `ClipboardHistoryManagementAPI`

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root
