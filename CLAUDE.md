# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo Carnival is an Electron desktop application built with TypeScript, using Web Components for the UI and Tailwind CSS v4 for styling. The app features a three-panel layout (project sidebar, center content area, project detail sidebar) with collapsible side panels.

For feature details, see [docs/architecture.md](docs/architecture.md#feature-based-module-structure) and [docs/features/](docs/features/).

## Build and Development Commands

```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Full production build
npm start            # Build and launch the Electron app
npm run preview      # Preview Vite production build

# Type Checking
npx tsc --noEmit     # Run TypeScript type checking without emitting files

# Testing
npm run test:no-coverage  # Run tests without coverage (fastest)
npm test                 # Run tests with coverage report
npm run test:watch       # Run tests in watch mode

# E2E Testing
# Use /e2e-test skill with a scenario file or description
```

**After any code change, run `npx tsc --noEmit` to check for type errors, then run tests for affected modules.**

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
- **[docs/features/tasks.md](docs/features/tasks.md)** - Task management with TaskPaper format, hierarchical tasks, multi-project support, and smart filtering

### Development
- **[docs/development.md](docs/development.md)** - Development notes, security, styling, common tasks, debugging tips

### Testing
- **[docs/testing.md](docs/testing.md)** - Jest configuration, mocking patterns, test helpers, web component automation testing
- **E2E Testing** - Use `/e2e-test` skill with a scenario file (e.g., `e2e/scenarios/tasks-view.md`)

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
