# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, project detail sidebar) with collapsible side panels.

**Key Features:**
- Local folder project management with add/remove/select
- AI agent system with OpenAI-compatible API integration
- Agent template system for saving and reusing agent configurations
- Conversational AI interface with streaming, tool calling, and visual tool call indicators
- File tagging for including project files as context
- LLM provider management (OpenAI, GLM, and extensible for other providers)
- Model configuration management for reusing model settings across agents
- Custom tool execution in Node.js or Browser environments
- MCP (Model Context Protocol) tools support for integrating external AI servers
- App agent type for generating interactive JavaScript + HTML applications
- Quick notepad with global shortcut (Option+A), auto-save, file management, and delete capabilities
- Quick AI conversation with global shortcut (Option+Q)
- Snippets manager with global shortcut (Option+S), inline name editing, and keyboard navigation

## Build and Development Commands

```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Full production build
npm start            # Build and launch the Electron app
npm run preview      # Preview Vite production build

# Testing
npm run test:no-coverage  # Run tests without coverage (fastest)
npm test                 # Run tests with coverage report
npm run test:watch       # Run tests in watch mode
```

**After any code change, run tests for affected modules.**

## Critical Patterns (Must Follow)

### Event Listener Management (CRITICAL)

Web Components must use clone-and-replace pattern to prevent duplicate listeners:

```typescript
// Clone the element to remove old listeners
const newElement = element.cloneNode(true);
// Replace the old element with the clone
element.replaceWith(newElement);
// Attach fresh listeners to the new element
(newElement as HTMLElement).addEventListener('click', handler);
```

**Where to use:** Panel toggle buttons, tree node clicks, any dynamically generated interactive elements.

See `src/components/project-panel.ts:82-90` for implementation example.

### Event Bubbling Best Practices

When forwarding events between components, use `bubbles: false` to prevent infinite loops:

```javascript
// GOOD
target.dispatchEvent(new CustomEvent('event-name', {
  detail: data,
  bubbles: false,  // Prevents infinite loop
  composed: true
}));
```

### XSS Prevention

All user-generated content must be escaped:

```typescript
private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

## Documentation

The documentation has been split into focused modules for better performance:

### Architecture
- **[docs/architecture.md](docs/architecture.md)** - Electron process structure, module organization, IPC channels, storage, and type definitions

### Features
- **[docs/features/agent-templates.md](docs/features/agent-templates.md)** - Agent template system for saving and reusing agent configurations
- **[docs/features/chat-system.md](docs/features/chat-system.md)** - Conversational AI interface, streaming, tool calling, provider integration
- **[docs/features/dark-mode.md](docs/features/dark-mode.md)** - Dark mode theming with toggle support
- **[docs/features/file-tagging.md](docs/features/file-tagging.md)** - File @mention system for including project context
- **[docs/features/llm-providers.md](docs/features/llm-providers.md)** - LLM provider management (OpenAI, GLM, custom providers)
- **[docs/features/model-configs.md](docs/features/model-configs.md)** - Model configuration management for reusing model settings
- **[docs/features/project-panel.md](docs/features/project-panel.md)** - Project sidebar and file tree panel
- **[docs/features/tool-management.md](docs/features/tool-management.md)** - Custom tools with Node.js/Browser execution
- **[docs/features/mcp-tools.md](docs/features/mcp-tools.md)** - MCP tools support for external AI servers
- **[docs/features/app-agents.md](docs/features/app-agents.md)** - App agent type for generating interactive applications
- **[docs/features/quick-notepad.md](docs/features/quick-notepad.md)** - Quick notepad with global shortcut, auto-save, and file management
- **[docs/features/quick-ai.md](docs/features/quick-ai.md)** - Quick AI conversation with global shortcut
- **[docs/features/snippets.md](docs/features/snippets.md)** - Snippets manager with global shortcut, inline name editing, and keyboard navigation

### Development
- **[docs/development.md](docs/development.md)** - Development notes, security, styling, common tasks, debugging tips

### Testing
- **[docs/testing.md](docs/testing.md)** - Jest configuration, mocking patterns, test helpers, web component automation testing

## Quick Reference

### Main Process Modules
- `src/main.ts` - Core app setup, window creation, IPC coordination
- `src/main/project-management.ts` - Project CRUD, file tree, file listing
- `src/main/agent-management.ts` - Agent CRUD operations
- `src/main/agent-template-management.ts` - Agent template CRUD, validation, storage
- `src/main/provider-management.ts` - LLM provider CRUD, validation, default URLs
- `src/main/model-config-management.ts` - Model configuration CRUD, validation, storage
- `src/main/settings-management.ts` - App settings CRUD, theme preference storage, validation
- `src/main/llm/` - LLM streaming module with provider-specific implementations
  - `index.ts` - Main routing interface (streamLLM, buildFileContentMessages, buildAllMessages) and tool execution routing (executeToolWithRouting with MCP tool support)
  - `openai.ts` - OpenAI-compatible streaming with conversation history management and native tool calling
  - `glm.ts` - GLM streaming with conversation history management and native tool calling
- `src/main/chat-agent-management.ts` - Chat agent system prompt generation, IPC handlers
- `src/main/app-agent-management.ts` - App agent system prompt generation, IPC handlers
- `src/main/tool-management.ts` - Tool CRUD, JSON Schema validation, execution routing, MCP tools integration
- `src/main/mcp-client.ts` - MCP client implementation for server connections
- `src/main/mcp-storage.ts` - MCP server configuration storage and management
- `src/main/notepad-management.ts` - Notepad file operations, IPC handlers
- `src/main/notepad-window.ts` - Notepad window lifecycle, global shortcut registration
- `src/main/quick-ai-management.ts` - Quick AI conversation management, IPC handlers
- `src/main/quick-ai-window.ts` - Quick AI window lifecycle, global shortcut registration
- `src/main/snippet-management.ts` - Snippet file operations, IPC handlers, name sanitization, conflict handling
- `src/main/snippet-window.ts` - Snippet window lifecycle, global shortcut registration

### Preload Modules
- `src/preload.ts` - Main preload script, exposes `window.electronAPI` via contextBridge
- `src/preload/project-management.ts` - Project management functions for preload (uses ipcRenderer)
- `src/preload/agent-management.ts` - Agent management functions for preload (uses ipcRenderer)
- `src/preload/agent-template-management.ts` - Agent template functions for preload (uses ipcRenderer)
- `src/preload/provider-management.ts` - Provider and model config functions for preload (uses ipcRenderer)
- `src/preload/tool-management.ts` - Tool management functions for preload (uses ipcRenderer)
- `src/preload/mcp-management.ts` - MCP server management functions for preload (uses ipcRenderer)
- `src/preload/settings-management.ts` - Settings management functions for preload (uses ipcRenderer)
- `src/preload/notepad-management.ts` - Notepad management functions for preload (uses ipcRenderer)
- `src/preload/quick-ai-management.ts` - Quick AI management functions for preload (uses ipcRenderer)
- `src/preload/snippet-management.ts` - Snippet management functions for preload (uses ipcRenderer)

### Renderer API Layer
- `src/api/project-management.ts` - Renderer-safe project management API (wraps window.electronAPI)
- `src/types/project-management.d.ts` - Project management type definitions (Project, FileTreeNode, etc.)
- `src/api/agent-management.ts` - Renderer-safe agent management API (wraps window.electronAPI)
- `src/types/agent-management.d.ts` - Agent management type definitions (Agent, etc.)
- `src/api/agent-template-management.ts` - Renderer-safe agent template management API (wraps window.electronAPI)
- `src/types/agent-template.d.ts` - Agent template type definitions (AgentTemplate, AgentTemplateManagementAPI)
- `src/api/provider-management.ts` - Renderer-safe provider management API (wraps window.electronAPI)
- `src/types/provider-management.d.ts` - Provider and model config type definitions (LLMProvider, ModelConfig, LLMProviderType)
- `src/api/tool-management.ts` - Renderer-safe tool management API (wraps window.electronAPI)
- `src/types/tool-management.d.ts` - Tool management type definitions (Tool, ToolExecutionRequest, ToolExecutionResult, JSONSchema, MCPServer, MCPTool)
- `src/api/mcp-management.ts` - Renderer-safe MCP server management API (wraps window.electronAPI)
- `src/types/mcp-management.d.ts` - MCP management type definitions (MCPServer, MCPTool, MCPManagementAPI)
- `src/api/settings-management.ts` - Renderer-safe settings management API (wraps window.electronAPI)
- `src/types/settings-management.d.ts` - Settings management type definitions (AppSettings, SettingsManagementAPI)
- `src/api/notepad-management.ts` - Renderer-safe notepad management API (wraps window.electronAPI)
- `src/types/notepad-management.d.ts` - Notepad management type definitions (NotepadFile, NotepadManagementAPI)
- `src/api/quick-ai-management.ts` - Renderer-safe Quick AI management API (wraps window.electronAPI)
- `src/types/quick-ai-management.d.ts` - Quick AI management type definitions (QuickAIManagementAPI, QuickAISettingsValidation)
- `src/api/snippet-management.ts` - Renderer-safe snippet management API (wraps window.electronAPI)
- `src/types/snippet-management.d.ts` - Snippet management type definitions (SnippetFile, SnippetManagementAPI)

### UI Components (Web Components)
- `app-container` - Root layout, event forwarding (uses `getSettingsManagementAPI()`)
- `project-panel` - Left sidebar, project management (uses `getProjectManagementAPI()`)
- `project-agent-dashboard` - Center area, agent grid/chat switching
- `conversation-panel` - Reusable chat interface (event-driven, tool call indicators, message factories for user, assistant, and tool call messages)
- `user-message` - Web Component for user messages (plain text rendering, HTML escaping, blue background, right-aligned)
- `assistant-message` - Web Component for assistant messages (markdown rendering, reasoning display, save/copy buttons, factory pattern for handlers)
- `app-code-message` - Web Component for app agent messages (HTML code block extraction, app code callouts with View App button, markdown rendering for remaining content, save/copy buttons, factory pattern)
- `tool-call-message` - Web Component for tool call messages (status indicators, parameter/result display, collapsible details, factory pattern)
- `chat-panel` - Right sidebar chat interface (uses conversation-panel, provides message factories for user, assistant, and tool call messages, handles chat-agent IPC)
- `app-panel` - Conditional layout for App-type agents: default conversation view (full-width) or preview view (full-width app preview with close button), uses conversation-panel, provides AppCodeMessage factory for app-specific rendering, handles app-agent IPC
- `project-detail-panel` - Right sidebar, file tree (uses `getProjectManagementAPI()`)
- `agent-form-dialog` - Agent creation/editing with model config and provider selection (uses `getAgentManagementAPI()`, `getProviderManagementAPI()`, and `getAgentTemplateManagementAPI()`)
- `agent-template-dialog` - Agent template management with list and form views (uses `getAgentTemplateManagementAPI()` and `getProviderManagementAPI()`)
- `provider-dialog` - LLM provider management (uses `getProviderManagementAPI()`)
- `model-config-dialog` - Model configuration management with extra properties support (uses `getProviderManagementAPI()`)
- `tools-dialog` - Tool management with testing, MCP server configuration (uses `getToolManagementAPI()`)
- `tool-test-dialog` - Tool execution testing (uses `getToolManagementAPI()`)
- `settings-dialog` - App settings management with theme selection, notepad save location, snippet save location, and Quick AI defaults (uses `getSettingsManagementAPI()` and `getProviderManagementAPI()`)
- `notepad-window` - Standalone notepad window with file list and auto-save (uses `getNotepadManagementAPI()`)
- `quick-ai-window` - Standalone Quick AI conversation window with tool support, error handling, and dark mode support (uses `getQuickAIManagementAPI()` and `getSettingsManagementAPI()`)
- `snippet-window` - Standalone snippet window with inline name editing, keyboard navigation, and clipboard integration (uses `getSnippetManagementAPI()`)

### Transformers
- `src/components/transformers/openai-transformer.ts` - Transforms OpenAI native message format to ChatMessage format for UI display
- `src/components/transformers/glm-transformer.ts` - Transforms GLM native message format to ChatMessage format (standalone implementation)
- `src/components/transformers/index.ts` - Factory function to create appropriate transformer based on provider type

### Key IPC Channels
- `projects:*` - Project CRUD operations
- `agents:*` - Agent CRUD operations
- `agent-templates:*` - Agent template CRUD operations (get, add, update, remove, getById)
- `providers:*` - LLM provider CRUD operations (get, add, update, remove, getById)
- `model-configs:*` - Model configuration CRUD operations (get, add, update, remove, getById)
- `settings:*` - Settings CRUD operations (get, update)
- `tools:*` - Tool CRUD and execution
- `mcp:*` - MCP server and tool management
- `project:getFileTree` - File tree structure
- `files:list`, `files:readContents` - File operations for @mention
- `files:saveMessageToFile` - Save message content to a file in the project folder
- `chat-agent:streamMessage` - Chat agent streaming (with tools + files)
- `chat-agent:clearHistory` - Clear chat agent conversation history
- `chat-agent:toolCall` - Real-time tool call status updates (one-way IPC from main to renderer)
- `app-agent:streamMessage` - App agent streaming (files only, no tools)
- `app-agent:clearHistory` - Clear app agent conversation history
- `notepad:getFiles` - Get list of notepad files
- `notepad:readFile` - Read notepad file content
- `notepad:createFile` - Create new notepad file
- `notepad:saveContent` - Save notepad content (auto-save)
- `notepad:deleteFile` - Delete notepad file
- `quick-ai:streamMessage` - Quick AI streaming (with tools, no files)
- `quick-ai:clearHistory` - Clear Quick AI conversation history
- `quick-ai:validateSettings` - Validate Quick AI settings (provider and model configured)
- `quick-ai:windowShown` - Quick AI window shown event (one-way IPC from main to renderer)
- `quick-ai:toolCall` - Tool call events during Quick AI streaming (one-way IPC from main to renderer)
- `snippets:getFiles` - Get list of snippet files
- `snippets:readFile` - Read snippet file content
- `snippets:createFile` - Create new snippet file
- `snippets:saveContent` - Save snippet content (auto-save)
- `snippets:renameFile` - Rename snippet file
- `snippets:deleteFile` - Delete snippet file
- `snippets:closeWindow` - Close snippet window

### Storage Locations
- `app.getPath('userData')/projects.json` - Project list
- `app.getPath('userData')/agent-templates.json` - Agent templates
- `app.getPath('userData')/providers.json` - LLM providers
- `app.getPath('userData')/model-configs.json` - Model configurations
- `app.getPath('userData')/settings.json` - App settings (theme preference, notepad save location, snippet save location, Quick AI defaults)
- `app.getPath('userData')/tools.json` - Custom tools and MCP servers
- `{notepadSaveLocation}/` - Notepad files (.txt format, timestamp naming) - user-configured location
- `{snippetSaveLocation}/` - Snippet files (.txt format, user-provided names) - user-configured location
- `{projectFolder}/agent-{name}.json` - Agent files (stored in project folders)

## TypeScript Configuration

- Target: ES2020, Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root
- ElectronAPI interface defined in `src/types/electron-api.d.ts`
- Project management types in `src/types/project-management.d.ts` (Project, FileTreeNode, etc.)
- Agent management types in `src/types/agent-management.d.ts` (Agent, etc.)
- Provider management types in `src/types/provider-management.d.ts` (LLMProvider, ModelConfig, LLMProviderType)
- Tool management types in `src/types/tool-management.d.ts` (Tool, ToolExecutionRequest, ToolExecutionResult, ToolCallEvent, JSONSchema)
- Settings management types in `src/types/settings-management.d.ts` (AppSettings, SettingsManagementAPI)
- Preload modules in `src/preload/*.ts` (contextBridge exposure)
- Renderer API modules in `src/api/*.ts` (type-safe wrappers for window.electronAPI)

## Styling

- Tailwind CSS v4 with PostCSS
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component

## Common Workflows

### Using the Renderer API Layer

When creating renderer components that need provider or model config management functionality:

```typescript
// Import the API getter function and types
import { getProviderManagementAPI } from '../api/provider-management';
import type { ProviderManagementAPI, LLMProvider, ModelConfig } from '../types/provider-management';

export class MyComponent extends HTMLElement {
  private api: ProviderManagementAPI;

  constructor() {
    super();
    // Initialize API instance
    this.api = getProviderManagementAPI();
  }

  async loadProviders() {
    // Use the API - type-safe and testable
    const providers = await this.api.getProviders();
    // ... rest of implementation
  }
}
```

When creating renderer components that need project management functionality:

```typescript
// Import the API getter function and types
import { getProjectManagementAPI } from '../api/project-management';
import type { ProjectManagementAPI, Project } from '../types/project-management';

export class MyComponent extends HTMLElement {
  private api: ProjectManagementAPI;

  constructor() {
    super();
    // Initialize API instance
    this.api = getProjectManagementAPI();
  }

  async loadProjects() {
    // Use the API - type-safe and testable
    const projects = await this.api.getProjects();
    // ... rest of implementation
  }
}
```

**Benefits:**
- Type safety through `ProjectManagementAPI` interface
- Easy to mock in tests (just create a mock object)
- No direct dependency on `window.electronAPI`
- Prevents bundling Electron APIs into renderer code

### Adding a New Feature
1. Read relevant documentation in `docs/`
2. Check for similar existing patterns in codebase
3. Write tests first (see `docs/testing.md`)
   - Main process modules: Write storage helper and IPC handler tests
   - Web Components: Write rendering, interaction, event, and XSS prevention tests
4. Implement feature following established patterns
5. Run tests to ensure nothing breaks
6. **Update relevant documentation** (see "Documentation Maintenance" below)

### Documentation Maintenance

**When to Update Documentation:**

After making code changes, update documentation if you:
- Add a new module or feature
- Modify IPC channels or storage locations
- Change critical patterns or best practices
- Add new components or change component behavior
- Update test structure or add new test types
- Modify configuration or build process

**What to Update:**

1. **CLAUDE.md** - Update when:
   - Adding new main process modules (add to "Main Process Modules" section)
   - Adding new UI components (add to "UI Components" section)
   - Adding new IPC channels (add to "Key IPC Channels" section)
   - Changing storage locations (update "Storage Locations" section)
   - Adding new file types or extensions (update "File Extensions Reference")

2. **docs/architecture.md** - Update when:
   - Adding new modules (module organization, dependencies, pattern)
   - Modifying IPC channels (add to relevant sections)
   - Changing storage (update storage section)
   - Modifying type definitions (add to "Type Definitions")

3. **docs/features/[feature].md** - Update when:
   - Modifying feature behavior
   - Adding new functionality to existing features
   - Changing implementation details

4. **docs/testing.md** - Update when:
   - Adding new test files or test structure
   - Adding new test helpers or patterns
   - Updating testing configuration

**Documentation Update Workflow:**
1. After code changes are complete and tests pass
2. Review which documentation sections are affected
3. Update the relevant documentation files
4. Verify documentation links are correct
5. Ensure examples and code snippets in docs are current

### Debugging IPC Issues
1. Check handler registered in main process module
2. Check exposure in preload script
3. Check usage in renderer via `window.electronAPI`
4. Use `console.log()` in main and renderer to trace calls
5. Verify channel names match exactly

### Adding a New Module
1. Create file in `src/main/`
2. Export helpers and `register*IPCHandlers()` function
3. Import and register in `src/main.ts`
4. Document in `docs/architecture.md`

## File Extensions Reference

When working with specific file types:
- `.ts` - TypeScript source files
- `.json` - Configuration and data files (agents, projects, providers, tools)
- `.test.ts` - Test files
- `.md` - Documentation files

## Performance Notes

This CLAUDE.md file has been optimized for performance by:
- Splitting into modular documentation files (~75% size reduction)
- Keeping only essential information in main file
- Linking to detailed docs for deep dives
- Removing redundancy and verbose examples

For detailed information about any topic, refer to the appropriate documentation file in `docs/`.
