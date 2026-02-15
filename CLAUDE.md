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
- Clipboard history with global shortcut (Shift+Cmd+V / Shift+Ctrl+V), auto-monitoring, text and image support

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

See `src/project/components/project-panel.ts` for implementation example.

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
- **[docs/features/clipboard-history.md](docs/features/clipboard-history.md)** - Clipboard history with global shortcut, auto-monitoring, text and image support

### Development
- **[docs/development.md](docs/development.md)** - Development notes, security, styling, common tasks, debugging tips

### Testing
- **[docs/testing.md](docs/testing.md)** - Jest configuration, mocking patterns, test helpers, web component automation testing

## Project Structure

The codebase uses a **feature-based module structure** where all related files for a feature are grouped together:

```
src/
├── main.ts              # Main entry point
├── renderer.ts          # Main renderer entry
├── preload.ts           # Preload script entry
├── styles.css           # Global styles
│
├── core/                # Core application infrastructure
│   ├── app-container.ts
│   ├── project-agent-dashboard.ts
│   └── types/electron-api.d.ts
│
├── project/             # Project management feature
│   ├── main/project-management.ts
│   ├── components/project-panel.ts, project-detail-panel.ts
│   ├── preload/index.ts
│   ├── api/index.ts
│   └── types/index.ts
│
├── agent/               # Agent system feature
│   ├── main/agent-management.ts, agent-template-management.ts, chat-agent-management.ts, app-agent-management.ts
│   ├── components/agent-form-dialog.ts, agent-template-dialog.ts, chat-panel.ts, app-panel.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
├── llm/                 # LLM provider feature
│   ├── main/provider-management.ts, model-config-management.ts
│   ├── main/streaming/  # LLM streaming implementations
│   ├── components/provider-dialog.ts, model-config-dialog.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
├── tools/               # Tool system feature
│   ├── main/tool-management.ts, tool-worker-executor.ts, mcp-client.ts, mcp-storage.ts
│   ├── components/tools-dialog.ts, tool-test-dialog.ts
│   ├── browser/browser-tool-executor.ts
│   ├── tool-worker.ts   # Tool worker entry
│   ├── preload/
│   ├── api/
│   └── types/
│
├── conversation/        # Shared conversation system
│   ├── components/conversation-panel.ts, user-message.ts, assistant-message.ts, tool-call-message.ts, app-code-message.ts
│   └── transformers/    # Message format transformers
│
├── settings/            # Settings feature
│   ├── main/settings-management.ts
│   ├── components/settings-dialog.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
├── notepad/             # Notepad feature
│   ├── main/notepad-management.ts, notepad-window.ts
│   ├── components/notepad-window.ts
│   ├── renderer.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
├── quick-ai/            # Quick AI feature
│   ├── main/quick-ai-management.ts, quick-ai-window.ts
│   ├── components/quick-ai-window.ts
│   ├── renderer.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
├── snippets/            # Snippets feature
│   ├── main/snippet-management.ts, snippet-window.ts
│   ├── components/snippet-window.ts
│   ├── renderer.ts
│   ├── preload/
│   ├── api/
│   └── types/
│
└── clipboard-history/   # Clipboard history feature
    ├── main/clipboard-history-management.ts, clipboard-history-window.ts, clipboard-watcher.ts
    ├── components/clipboard-history-window.ts
    ├── renderer.ts
    ├── preload/
    ├── api/
    └── types/
```

## Quick Reference

### Entry Points
- `src/main.ts` - Core app setup, window creation, IPC coordination
- `src/renderer.ts` - Main renderer entry, imports components
- `src/preload.ts` - Exposes `window.electronAPI` via contextBridge
- `src/tool-worker.ts` → `src/tools/tool-worker.ts` - Tool execution worker

### Main Process Modules (by feature)
- `src/project/main/project-management.ts` - Project CRUD, file tree, file listing
- `src/agent/main/agent-management.ts` - Agent CRUD operations
- `src/agent/main/agent-template-management.ts` - Agent template CRUD, validation, storage
- `src/agent/main/chat-agent-management.ts` - Chat agent system prompt generation, IPC handlers
- `src/agent/main/app-agent-management.ts` - App agent system prompt generation, IPC handlers
- `src/llm/main/provider-management.ts` - LLM provider CRUD, validation, default URLs
- `src/llm/main/model-config-management.ts` - Model configuration CRUD, validation, storage
- `src/llm/main/streaming/` - LLM streaming module with provider-specific implementations
  - `index.ts` - Main routing interface (streamLLM, buildFileContentMessages, buildAllMessages) and tool execution routing
  - `openai.ts` - OpenAI-compatible streaming with conversation history management and native tool calling
  - `glm.ts` - GLM streaming with conversation history management and native tool calling
- `src/tools/main/tool-management.ts` - Tool CRUD, JSON Schema validation, execution routing, MCP tools integration
- `src/tools/main/tool-worker-executor.ts` - Tool execution in isolated worker processes
- `src/tools/main/mcp-client.ts` - MCP client implementation for server connections
- `src/tools/main/mcp-storage.ts` - MCP server configuration storage and management
- `src/settings/main/settings-management.ts` - App settings CRUD, theme preference storage, validation
- `src/notepad/main/notepad-management.ts` - Notepad file operations, IPC handlers
- `src/notepad/main/notepad-window.ts` - Notepad window lifecycle, global shortcut registration
- `src/quick-ai/main/quick-ai-management.ts` - Quick AI conversation management, IPC handlers
- `src/quick-ai/main/quick-ai-window.ts` - Quick AI window lifecycle, global shortcut registration
- `src/snippets/main/snippet-management.ts` - Snippet file operations, IPC handlers, name sanitization
- `src/snippets/main/snippet-window.ts` - Snippet window lifecycle, global shortcut registration
- `src/clipboard-history/main/clipboard-watcher.ts` - Clipboard monitoring with content hash comparison
- `src/clipboard-history/main/clipboard-history-management.ts` - Clipboard history file operations, IPC handlers
- `src/clipboard-history/main/clipboard-history-window.ts` - Clipboard history window lifecycle, global shortcut registration

### Preload Modules (by feature)
- `src/preload.ts` - Main preload script, exposes `window.electronAPI` via contextBridge
- `src/project/preload/index.ts` - Project management functions for preload
- `src/agent/preload/agent-management.ts` - Agent management functions for preload
- `src/agent/preload/agent-template-management.ts` - Agent template functions for preload
- `src/llm/preload/index.ts` - Provider and model config functions for preload
- `src/tools/preload/index.ts` - Tool management functions for preload
- `src/settings/preload/index.ts` - Settings management functions for preload
- `src/notepad/preload/notepad-management.ts` - Notepad management functions for preload
- `src/quick-ai/preload/quick-ai-management.ts` - Quick AI management functions for preload
- `src/snippets/preload/snippet-management.ts` - Snippet management functions for preload
- `src/clipboard-history/preload/clipboard-history-management.ts` - Clipboard history management functions for preload

### Renderer API Layer (by feature)
- `src/project/api/index.ts` - Renderer-safe project management API
- `src/project/types/index.ts` - Project management type definitions (Project, FileTreeNode, etc.)
- `src/agent/api/index.ts` - Renderer-safe agent management API
- `src/agent/types/index.ts` - Agent management type definitions (Agent, etc.)
- `src/llm/api/index.ts` - Renderer-safe provider management API
- `src/llm/types/index.ts` - Provider and model config type definitions
- `src/tools/api/index.ts` - Renderer-safe tool management API
- `src/tools/types/index.ts` - Tool management type definitions
- `src/settings/api/index.ts` - Renderer-safe settings management API
- `src/settings/types/index.ts` - Settings management type definitions
- `src/notepad/api/index.ts` - Renderer-safe notepad management API
- `src/notepad/types/index.ts` - Notepad management type definitions
- `src/quick-ai/api/index.ts` - Renderer-safe Quick AI management API
- `src/quick-ai/types/index.ts` - Quick AI management type definitions
- `src/snippets/api/index.ts` - Renderer-safe snippet management API
- `src/snippets/types/index.ts` - Snippet management type definitions
- `src/clipboard-history/api/index.ts` - Renderer-safe clipboard history management API
- `src/clipboard-history/types/index.ts` - Clipboard history type definitions

### UI Components (Web Components)
- `src/core/app-container.ts` - Root layout, event forwarding
- `src/project/components/project-panel.ts` - Left sidebar, project management
- `src/project/components/project-detail-panel.ts` - Right sidebar, file tree
- `src/core/project-agent-dashboard.ts` - Center area, agent grid/chat switching
- `src/conversation/components/conversation-panel.ts` - Reusable chat interface
- `src/conversation/components/user-message.ts` - User messages (plain text, HTML escaping)
- `src/conversation/components/assistant-message.ts` - Assistant messages (markdown, save/copy)
- `src/conversation/components/tool-call-message.ts` - Tool call messages (status indicators)
- `src/conversation/components/app-code-message.ts` - App agent messages (HTML code extraction)
- `src/agent/components/chat-panel.ts` - Chat sidebar interface
- `src/agent/components/app-panel.ts` - App agent panel with preview
- `src/agent/components/agent-form-dialog.ts` - Agent creation/editing
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

### Transformers
- `src/conversation/transformers/openai-transformer.ts` - Transforms OpenAI native message format to ChatMessage format
- `src/conversation/transformers/glm-transformer.ts` - Transforms GLM native message format to ChatMessage format
- `src/conversation/transformers/index.ts` - Factory function to create appropriate transformer

### Key IPC Channels
- `projects:*` - Project CRUD operations
- `agents:*` - Agent CRUD operations
- `agent-templates:*` - Agent template CRUD operations
- `providers:*` - LLM provider CRUD operations
- `model-configs:*` - Model configuration CRUD operations
- `settings:*` - Settings CRUD operations
- `tools:*` - Tool CRUD and execution
- `mcp:*` - MCP server and tool management
- `project:getFileTree` - File tree structure
- `files:list`, `files:readContents` - File operations for @mention
- `files:saveMessageToFile` - Save message content to a file
- `chat-agent:streamMessage`, `chat-agent:clearHistory`, `chat-agent:toolCall` - Chat agent
- `app-agent:streamMessage`, `app-agent:clearHistory` - App agent
- `notepad:*` - Notepad operations
- `quick-ai:*` - Quick AI operations
- `snippets:*` - Snippet operations
- `clipboard-history:*` - Clipboard history operations

### Storage Locations
- `app.getPath('userData')/projects.json` - Project list
- `app.getPath('userData')/agent-templates.json` - Agent templates
- `app.getPath('userData')/providers.json` - LLM providers
- `app.getPath('userData')/model-configs.json` - Model configurations
- `app.getPath('userData')/settings.json` - App settings
- `app.getPath('userData')/tools.json` - Custom tools and MCP servers
- `{notepadSaveLocation}/` - Notepad files (.txt format)
- `{snippetSaveLocation}/` - Snippet files (.txt format)
- `{clipboardHistorySaveLocation}/` - Clipboard history files
- `{projectFolder}/agent-{name}.json` - Agent files

## Common Workflows

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

### Adding a New Feature
1. Create feature directory under `src/`
2. Create subdirectories: `main/`, `components/`, `preload/`, `api/`, `types/`
3. Create entry point (e.g., `renderer.ts` for standalone windows)
4. Write tests first (see `docs/testing.md`)
5. Implement feature following established patterns
6. Register IPC handlers in `src/main.ts`
7. Expose preload functions in `src/preload.ts`
8. Run tests to ensure nothing breaks
9. **Update relevant documentation**

### Debugging IPC Issues
1. Check handler registered in main process module
2. Check exposure in preload script
3. Check usage in renderer via `window.electronAPI`
4. Use `console.log()` in main and renderer to trace calls
5. Verify channel names match exactly

## File Extensions Reference

When working with specific file types:
- `.ts` - TypeScript source files
- `.json` - Configuration and data files
- `.test.ts` - Test files
- `.md` - Documentation files

## Performance Notes

This CLAUDE.md file has been optimized for performance by:
- Splitting into modular documentation files
- Keeping only essential information in main file
- Linking to detailed docs for deep dives
- Removing redundancy and verbose examples

For detailed information about any topic, refer to the appropriate documentation file in `docs/`.
