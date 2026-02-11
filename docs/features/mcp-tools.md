# MCP (Model Context Protocol) Tools

## Overview

Turbo Carnival supports MCP (Model Context Protocol) tools, allowing AI agents to use tools from external MCP servers. MCP tools coexist with custom JavaScript tools and are executed transparently by LLM providers.

## Architecture

### Key Components

- **`src/main/mcp-client.ts`**: MCP client implementation for server connections, tool discovery, and execution
- **`src/main/mcp-storage.ts`**: MCP server configuration storage helpers
- **`src/main/tool-management.ts`**: Unified tool management (custom + MCP)
- **`src/components/tools-dialog.ts`**: Two-tab UI for managing custom and MCP tools

### Tool Storage

Both custom and MCP tools are stored in `tools.json`:

```json
{
  "tools": [...],        // Custom JavaScript tools
  "mcpServers": [        // MCP server configurations
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {}
    }
  ]
}
```

**Note:** The `connected`, `toolCount`, and `lastConnected` fields are runtime-only and are NOT persisted to storage.

### Tool Namespacing

MCP tools use namespaced names to avoid conflicts: `serverName__toolName`

For example, if the "filesystem" MCP server exposes a "read_file" tool, it will be available as:
- `filesystem__read_file`

## Configuration

### MCP Server Configuration Format

#### Stdio Transport (Recommended for local servers)

```json
{
  "name": "filesystem",
  "transport": "stdio",
  "command": "node",
  "args": ["path/to/server.js"],
  "env": {
    "OPTIONAL_VAR": "value"
  }
}
```

#### Streamable-HTTP Transport (For remote HTTP servers with streaming support)

```json
{
  "name": "jira",
  "transport": "streamable-http",
  "url": "https://mcp-jira.int.rclabenv.com/mcp",
  "headers": {
    "jira_token": "your-jira-token",
    "mcp-session-id": "unique-session-id"
  }
}
```

**Note:** Streamable-HTTP transport uses the fetch API with streaming responses, which supports custom headers unlike SSE's EventSource.

### Configuration Fields

- `name` (required): Unique server identifier
- `transport` (required): Either "stdio" or "streamable-http"
- `command` (required for stdio): Command to execute
- `args` (optional): Array of command arguments
- `url` (required for streamable-http): Server URL
- `env` (optional): Environment variables for stdio transport
- `headers` (optional): HTTP headers for streamable-http transport (e.g., API keys, auth tokens, session IDs)
- `connected` (runtime-only): Connection status (NOT saved to storage)
- `toolCount` (runtime-only): Number of discovered tools (NOT saved to storage)
- `lastConnected` (runtime-only): Timestamp of last connection (NOT saved to storage)

## Usage

### Adding an MCP Server

1. Open the Tools dialog from the main window
2. Switch to the "MCP Tools" tab
3. Click "Add Server"
4. Paste your server configuration in JSON format
5. Click "Test Connection" to verify
6. Click "Save Server" to connect and discover tools

### Managing MCP Servers

- **Reconnect**: Reconnect to a server and refresh its cached tools
  - Click the **Reconnect** button (refresh icon) to reconnect to a server
  - This disconnects and reconnects, then updates the cached tools
- **Disconnect**: Disconnect from a server (clears cached tools)
  - Click the **Disconnect** button (unlink icon) to disconnect from a server
  - The server configuration remains saved for next startup
- **Edit**: Modify server configuration (automatically reconnects on save)
- **Delete**: Remove server and disconnect (clears cached tools)

### Using MCP Tools in Chat

MCP tools work transparently with chat agents:

1. Select a chat agent
2. Start a conversation
3. The AI agent can automatically invoke MCP tools when needed
4. Tool calls are displayed in the conversation with status indicators

## Connection Lifecycle

### Startup

When the app starts:
1. All saved MCP server configurations are loaded from storage
2. The app automatically connects to all MCP servers via `initializeMCPServers()`
3. Tools from each server are discovered and cached in memory
4. Failed connections are logged but don't prevent other servers from connecting

**Note:** Tool loading is synchronous - tools are cached in memory at startup, so `loadTools()` and `getToolByName()` are fast synchronous operations that don't require awaiting.

### During Operation

- Tools are loaded from the in-memory cache (not from reconnecting to servers)
- Tools are executed on-demand when invoked by LLM providers using cached connections
- Failed tool executions show error messages in the chat
- Servers can be explicitly reconnected from the Tools dialog using the reconnect button
- When a server is removed, its cached tools are automatically cleared from memory

### Shutdown

When the app quits:
1. All MCP server connections are cleanly closed
2. All cached tools are cleared from memory
3. Server configurations are preserved for next startup

## Tool Execution

### LLM Integration

MCP tools are transparently integrated with LLM providers during tool calling:

**Execution Flow:**
```
LLM Provider → detects tool call → executeToolWithRouting() → MCP Client → MCP Server → returns result
```

**Key Integration Points:**
- **`src/main/llm/index.ts`**: `executeToolWithRouting()` routes MCP tools to the appropriate execution function
- **Tool Type Detection**: Tools with `toolType === 'mcp'` are routed to MCP client
- **Server/Tool Names**: Uses `mcpServerName` and `mcpToolName` properties to identify the tool
- **Streaming Support**: Tools with `isStreamable === true` use `executeMCPToolStream()` for real-time updates

**MCP Tool Properties:**
```typescript
interface Tool {
  toolType: 'mcp';
  mcpServerName: string;    // MCP server name
  mcpToolName: string;      // Original tool name from server
  isStreamable?: boolean;   // Whether tool supports streaming
  // ... other properties
}
```

### Standard Execution

Most MCP tools execute synchronously:
```
LLM calls tool → MCP client invokes tool → Returns result → LLM processes result
```

### Streaming Execution

Some MCP tools support streaming for real-time updates:
```
LLM calls tool → MCP client streams chunks → UI updates in real-time → Returns final result
```

**Implementation:**
- Streamable tools use `executeMCPToolStream()` function
- Chunks sent via `tools:streamChunk` IPC events to renderer
- Currently supported for streamable-http transport

## Implementation Details

### Type Definitions

```typescript
// Runtime-only fields are NOT persisted to storage
export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'streamable-http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;  // HTTP headers for streamable-http
  connected?: boolean;      // Runtime-only: NOT saved
  toolCount?: number;       // Runtime-only: NOT saved
  lastConnected?: number;   // Runtime-only: NOT saved
}

export interface Tool {
  // ... existing properties ...
  toolType?: 'custom' | 'mcp';
  mcpServerName?: string;
  mcpToolName?: string;
  isStreamable?: boolean;
}
```

### IPC Channels

- `mcp:getServers`: Get all MCP server configurations
- `mcp:addServer`: Add and connect to a server
- `mcp:updateServer`: Update and reconnect to a server
- `mcp:removeServer`: Remove a server and disconnect
- `mcp:testServer`: Test connection without saving
- `mcp:reconnectServer`: Reconnect to a server
- `mcp:disconnectServer`: Disconnect from a server
- `tools:streamChunk`: Streaming tool execution chunks (future)

### MCP Client Functions

- `connectToMCPServer(config)`: Connect and discover tools (caches tools in memory)
- `disconnectMCPServer(serverName)`: Disconnect from server and clear cached tools
- `executeMCPTool(serverName, toolName, parameters)`: Execute tool
- `executeMCPToolStream(serverName, toolName, parameters, onChunk)`: Execute with streaming
- `testMCPServerConnection(config)`: Test without saving
- `disconnectAllMCPServers()`: Cleanup on shutdown
- `getAllCachedMCPTools()`: Get all cached MCP tools from memory
- `clearMCPToolsCache()`: Clear all cached tools
- `initializeMCPServers()`: Connect to all saved servers and cache tools (called at app startup)

## Security Considerations

### Stdio Transport

- MCP servers run as child processes
- Environment variables can be passed for authentication
- Server code runs in isolated process

### Streamable-HTTP Transport

- Server URL should use HTTPS in production
- Custom headers can be used for authentication (API keys, tokens, etc.)
- Connection timeout applies

### Tool Execution

- MCP tools execute with same permissions as the app
- File system access is not sandboxed
- Network access depends on MCP server implementation

## Troubleshooting

### Connection Failures

1. **Invalid command/path**: Verify the command exists in PATH or use absolute path
2. **Missing dependencies**: Ensure MCP server dependencies are installed
3. **Invalid URL**: For streamable-http transport, verify the URL is correct and accessible

### Tool Discovery Issues

1. **No tools found**: Check MCP server logs for errors
2. **Invalid schema**: MCP server may return invalid tool schemas
3. **Timeout**: Increase connection timeout for slow servers

### Execution Failures

1. **Invalid parameters**: Check tool schema in MCP server documentation
2. **Server disconnected**: Reconnect from Tools dialog
3. **Permission denied**: Check file system/network permissions

## Examples

### Example: Filesystem MCP Server

```json
{
  "name": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
}
```

This server provides tools like:
- `filesystem__read_file`: Read file contents
- `filesystem__write_file`: Write to file
- `filesystem__list_directory`: List directory contents

### Example: GitHub MCP Server

```json
{
  "name": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "your_github_token_here"
  }
}
```

This server provides tools for interacting with GitHub repositories.

## Future Enhancements

- Streaming tool execution support (when MCP SDK adds support)
- Tool search and filtering in UI
- Batch tool execution
- Tool execution history
- Per-server authentication management
- Automatic reconnection with exponential backoff for failed connections
