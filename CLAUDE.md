# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, project detail sidebar) with collapsible side panels.

**Key Features:**
- Local folder project management with add/remove/select
- AI agent system with OpenAI-compatible API integration
- Conversational AI interface with streaming, tool calling, and visual tool call indicators
- File tagging for including project files as context
- LLM provider management (OpenAI, GLM, and extensible for other providers)
- Model configuration management for reusing model settings across agents
- Custom tool execution in Node.js or Browser environments
- App agent type for generating interactive JavaScript + HTML applications

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
- **[docs/features/chat-system.md](docs/features/chat-system.md)** - Conversational AI interface, streaming, tool calling, provider integration
- **[docs/features/file-tagging.md](docs/features/file-tagging.md)** - File @mention system for including project context
- **[docs/features/llm-providers.md](docs/features/llm-providers.md)** - LLM provider management (OpenAI, GLM, custom providers)
- **[docs/features/model-configs.md](docs/features/model-configs.md)** - Model configuration management for reusing model settings
- **[docs/features/project-panel.md](docs/features/project-panel.md)** - Project sidebar and file tree panel
- **[docs/features/tool-management.md](docs/features/tool-management.md)** - Custom tools with Node.js/Browser execution
- **[docs/features/app-agents.md](docs/features/app-agents.md)** - App agent type for generating interactive applications

### Development
- **[docs/development.md](docs/development.md)** - Development notes, security, styling, common tasks, debugging tips

### Testing
- **[docs/testing.md](docs/testing.md)** - Jest configuration, mocking patterns, test helpers, web component automation testing

## Quick Reference

### Main Process Modules
- `src/main.ts` - Core app setup, window creation, IPC coordination
- `src/main/project-management.ts` - Project CRUD, file tree, file listing
- `src/main/agent-management.ts` - Agent CRUD operations
- `src/main/app-management.ts` - App CRUD operations, execution in main/renderer processes
- `src/main/provider-management.ts` - LLM provider CRUD, validation, default URLs
- `src/main/model-config-management.ts` - Model configuration CRUD, validation, storage
- `src/main/llm/` - LLM streaming module with provider-specific implementations
  - `index.ts` - Main routing interface (streamLLM, buildFileContentMessages, buildAllMessages)
  - `openai.ts` - OpenAI-compatible streaming with conversation history management and native tool calling
  - `glm.ts` - GLM streaming with conversation history management and native tool calling
- `src/main/openai-client.ts` - Tool execution routing (Node.js/Browser environments)
- `src/main/chat-agent-management.ts` - Chat agent system prompt generation, IPC handlers
- `src/main/app-agent-management.ts` - App agent system prompt generation, IPC handlers
- `src/main/tool-management.ts` - Tool CRUD, JSON Schema validation, execution routing

### UI Components (Web Components)
- `app-container` - Root layout, event forwarding
- `project-panel` - Left sidebar, project management
- `project-agent-dashboard` - Center area, agent grid/chat switching
- `conversation-panel` - Reusable chat interface (event-driven, tool call indicators, dispatches `message-sent` events)
- `chat-panel` - Right sidebar chat interface (uses conversation-panel, handles chat-agent IPC)
- `app-panel` - Split-panel interface for App-type agents (uses conversation-panel, handles app-agent IPC)
- `project-detail-panel` - Right sidebar, file tree
- `agent-form-dialog` - Agent creation/editing with model config and provider selection
- `provider-dialog` - LLM provider management (OpenAI, GLM, custom providers)
- `model-config-dialog` - Model configuration management with extra properties support
- `tools-dialog` - Tool management with testing
- `tool-test-dialog` - Tool execution testing

### Key IPC Channels
- `projects:*` - Project CRUD operations
- `agents:*` - Agent CRUD operations
- `apps:*` - App CRUD operations, execution, data persistence
- `providers:*` - LLM provider CRUD operations (get, add, update, remove, getById)
- `model-configs:*` - Model configuration CRUD operations (get, add, update, remove, getById)
- `tools:*` - Tool CRUD and execution
- `project:getFileTree` - File tree structure
- `files:list`, `files:readContents` - File operations for @mention
- `chat-agent:streamMessage` - Chat agent streaming (with tools + files)
- `chat-agent:clearHistory` - Clear chat agent conversation history
- `chat-agent:toolCall` - Real-time tool call status updates (one-way IPC from main to renderer)
- `app-agent:streamMessage` - App agent streaming (files only, no tools)
- `app-agent:clearHistory` - Clear app agent conversation history

### Storage Locations
- `app.getPath('userData')/projects.json` - Project list
- `app.getPath('userData')/providers.json` - LLM providers
- `app.getPath('userData')/model-configs.json` - Model configurations
- `app.getPath('userData')/tools.json` - Custom tools
- `{projectFolder}/agent-{name}.json` - Agent files (stored in project folders)
- `{projectFolder}/app-{name}.json` - App files (stored in project folders, linked to agents)

## TypeScript Configuration

- Target: ES2020, Module: CommonJS
- Strict mode enabled
- Outputs to `dist/` from `src/` root
- Global types defined in `src/global.d.ts`

## Styling

- Tailwind CSS v4 with PostCSS
- Import in renderer: `import './styles.css'`
- All styling uses utility classes directly in component templates
- No separate CSS files per component

## Common Workflows

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
