# Tool Management

The app supports custom tools that can be called by AI agents during conversations. Tools can execute in either Node.js or Browser environments.

## Tool Features

- **Dual execution environments** - Node.js (worker process) or Browser (renderer)
- **JSON Schema parameters** - Tool parameters defined with JSON Schema validation
- **Timeout handling** - Configurable timeout per tool (default 30 seconds)
- **Tool testing** - Built-in test dialog for tool validation
- **Enable/disable** - Tools can be enabled or disabled
- **CRUD operations** - Create, read, update, and delete tools via tools dialog

## Tool Storage

Tools stored in `app.getPath('userData')/tools.json`:

```typescript
{
  name: string;           // Unique tool identifier
  description: string;    // Human-readable description
  code: string;           // Tool code to execute
  parameters: object;     // JSON Schema for parameters
  returns?: string;       // Optional return type description
  timeout: number;        // Execution timeout in milliseconds (default 30000)
  environment: 'node' | 'browser';  // Execution environment (default 'node')
  enabled: boolean;       // Whether tool is enabled (default true)
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

## Execution Environments

### Node.js Tool Execution (Worker Process)

Node.js tools execute in isolated worker processes for security:

- **Worker File**: `src/tool-worker.ts` (built to `dist/tool-worker.js`)
- **Worker Path**: Resolved as `../tool-worker.js` from `llm/index.ts`
- **Execution Model**: Each tool execution spawns a fresh worker process via `child_process.fork()`
- **Timeout Handling**: Configurable timeout per tool (default 30 seconds), enforced by worker
- **Isolation**: Tool code runs in separate process, preventing crashes in main process
- **Communication**: Worker receives execution request via IPC, returns result or error
- **Lifecycle**: Worker exits after execution (single-use, no persistent state)
- **Available APIs**: Node.js APIs (fs, path, child_process, etc.)

**Worker Communication Protocol:**
- **Request**: `{ type: 'execute', code: string, parameters: any, timeout: number }`
- **Response**: `{ success: boolean, result?: any, error?: string, executionTime: number }`

### Browser Tool Execution (Renderer Process)

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

### Execution Routing

When `tools:execute` is invoked, the main process checks the tool's `environment` field:
- If `'browser'`: Routes to renderer process for browser execution
- If `'node'` (or missing, defaults to `'node'`): Routes to worker process for Node.js execution
- Main process sets up Promise-based listener for result (for browser tools) or executes directly (for Node.js tools)

## Tool UI/UX

### Environment Selector

Dropdown in tool creation/edit form with two options:
- "Node.js (File system, child processes, etc.)"
- "Browser (Fetch, localStorage, DOM, etc.)"

Helper text explains execution context differences. Default value is 'node' for backward compatibility.

### Visual Badges

Color-coded badges in tool list:
- **Blue badge** labeled "Browser" for browser tools
- **Purple badge** labeled "Node" for Node.js tools
- **Green/Gray badge** for Enabled/Disabled status

Environment displayed in tool metadata: "Environment: browser • Timeout: 30000ms • Created: ..."

### Testing Behavior

Test dialog routes execution based on tool's environment setting:
- Browser tools: Execute directly in renderer via `executeToolInBrowser()`
- Node.js tools: Execute via main process IPC to worker

Execution time displayed for both environments.

## Tool Management Module

Located in `src/main/tool-management.ts`:

### Storage Helpers
- `getToolsPath()` - Returns path to tools.json
- `loadTools()` - Loads all tools from storage
- `saveTools()` - Saves all tools to storage
- `getToolByName()` - Gets a specific tool by name

### Validation
- `validateJSONSchema()` - Validates JSON Schema syntax for tool parameters

### IPC Handlers
- `tools:get` - Returns all stored tools
- `tools:add` - Adds a new tool (validates name, description, code, and parameters; validates code syntax)
- `tools:update` - Updates an existing tool (preserves createdAt, sets updatedAt)
- `tools:remove` - Removes a tool by name
- `tools:execute` - Executes a tool (routes to worker or renderer based on environment)

## Tool Calling in Chat

Tools are called by AI agents during conversations:

1. Tool descriptions formatted and included in system prompt via `formatToolDescriptions()`
2. AI agent outputs tool call as JSON: `{"toolname":"tool_name","arguments":{"param":"value"}}`
3. Tool call detected by checking for `"toolname"` key in response
4. Tool executed via worker (Node.js) or renderer (Browser)
5. Tool results formatted as user message
6. Second API call made with tool results
7. Final response delivered to user

## Related Files

- `src/main/tool-management.ts` - Tool storage and IPC handlers
- `src/main/llm/index.ts` - Tool execution routing (executeToolWithRouting)
- `src/tool-worker.ts` - Node.js tool worker process
- `src/renderer/browser-tool-executor.ts` - Browser tool executor
- `src/preload/tool-management.ts` - Preload module for tool management (uses ipcRenderer)
- `src/api/tool-management.ts` - Renderer-safe tool management API (wraps window.electronAPI)
- `src/api/tool-management.d.ts` - Tool management type definitions (Tool, ToolExecutionRequest, ToolExecutionResult, ToolCallEvent, JSONSchema)
- `src/components/tools-dialog.ts` - Tool management UI
- `src/components/tool-test-dialog.ts` - Tool testing UI

## Using the Tool Management API in Components

When creating renderer components that need tool management functionality:

```typescript
// Import the API getter function and types
import { getToolManagementAPI } from '../api/tool-management';
import type { ToolManagementAPI, Tool, ToolExecutionResult } from '../types/tool-management';

export class MyComponent extends HTMLElement {
  private api: ToolManagementAPI;

  constructor() {
    super();
    // Initialize API instance
    this.api = getToolManagementAPI();
  }

  async loadTools() {
    // Use the API - type-safe and testable
    const tools = await this.api.getTools();
    // ... rest of implementation
  }

  async executeTool(toolName: string, parameters: Record<string, any>) {
    const result = await this.api.executeTool({
      toolName,
      parameters
    });
    // ... handle result
  }
}
```

**Benefits:**
- Type safety through `ToolManagementAPI` interface
- Easy to mock in tests (just create a mock object)
- No direct dependency on `window.electronAPI`
- Prevents bundling Electron APIs into renderer code

## MCP Tools

### Overview
MCP (Model Context Protocol) tools allow Turbo Carnival to integrate with external AI servers and tools. MCP provides a standardized way for AI applications to discover and execute tools from various sources.

### Configuration
MCP servers are configured through the tools dialog with support for multiple transport protocols:

```typescript
interface MCPServer {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  url: string;                   // Server URL or command
  transport: 'stdio' | 'sse';    // Transport protocol
  enabled: boolean;              // Whether server is enabled
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

#### Stdio Transport
For local MCP servers:
- Configuration: `command` field with command to execute
- Example: `npx @modelcontextprotocol/server-filesystem /path/to/directory`
- Communication: Process stdio pipes

#### SSE Transport
For remote MCP servers:
- Configuration: `url` field with server endpoint
- Example: `http://localhost:3001/sse`
- Communication: Server-Sent Events over HTTP

### Server Management
- **Add server** - Configure new MCP server via tools dialog
- **Connect/Disconnect** - Toggle server connection status (connect/disconnect button in tools dialog)
- **Edit server** - Modify existing server configuration (automatically reconnects on save)
- **Remove server** - Delete server and its discovered tools
- **Test connection** - Verify server accessibility and tool discovery

### Tool Discovery
When an MCP server is added/enabled:
1. Connection established via configured transport
2. Server sends list of available tools
3. Tools stored with namespaced names (`server_name.tool_name`)
4. Tool metadata cached for UI display

### Tool Execution
MCP tools execute through the server:
- **Routing** - Tool execution forwarded to appropriate MCP server
- **Streaming** - Supports streaming execution for long-running tools
- **Parameters** - Parameters validated against server-provided schema
- **Results** - Results returned from server and formatted for AI agents

### UI Integration
- **Tools dialog tabs** - Separate MCP tab for server management
- **Tool badges** - MCP tools marked with "MCP" badge
- **Connection status** - Visual indicators for server health
- **Tool metadata** - Shows server origin and namespace

## Related Files

- `src/main/mcp-client.ts` - MCP client implementation
- `src/main/mcp-storage.ts` - MCP server storage management
- `src/main/tool-management.ts` - Tool CRUD and MCP integration
- `src/preload/mcp-management.ts` - Preload module for MCP management
- `src/api/mcp-management.ts` - Renderer-safe MCP API
- `src/types/mcp-management.d.ts` - MCP type definitions
- `src/components/tools-dialog.ts` - Tools dialog with MCP tab
