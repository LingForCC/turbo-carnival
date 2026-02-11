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
      "connected": true,
      "toolCount": 5,
      "lastConnected": 1234567890
    }
  ]
}
```

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

## Usage

### Adding an MCP Server

1. Open the Tools dialog from the main window
2. Switch to the "MCP Tools" tab
3. Click "Add Server"
4. Paste your server configuration in JSON format
5. Click "Test Connection" to verify
6. Click "Save Server" to connect and discover tools

### Managing MCP Servers

- **Reconnect**: Reconnect to a disconnected server
- **Edit**: Modify server configuration (automatically reconnects)
- **Delete**: Remove server and its tools

### Using MCP Tools in Chat

MCP tools work transparently with chat agents:

1. Select a chat agent
2. Start a conversation
3. The AI agent can automatically invoke MCP tools when needed
4. Tool calls are displayed in the conversation with status indicators

## Connection Lifecycle

### Startup

When the app starts:
1. MCP servers marked as `connected: true` are auto-connected
2. Tools are discovered and added to the available tools list
3. Failed connections are marked as `connected: false`

### During Operation

- Tools are executed on-demand when invoked by LLM providers
- Failed tool executions show error messages in the chat
- Servers can be reconnected manually from the Tools dialog

### Shutdown

When the app quits:
1. All MCP server connections are cleanly closed
2. Server configurations are preserved for next startup

## Tool Execution

### Standard Execution

Most MCP tools execute synchronously:
```
LLM calls tool → MCP client invokes tool → Returns result → LLM processes result
```

### Streaming Execution (Future)

Some MCP tools support streaming for real-time updates:
```
LLM calls tool → MCP client streams chunks → UI updates in real-time → Returns final result
```

Note: Streaming support will be added when the MCP SDK adds streaming capabilities.

## Implementation Details

### Type Definitions

```typescript
export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'streamable-http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;  // HTTP headers for streamable-http
  connected?: boolean;
  toolCount?: number;
  lastConnected?: number;
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
- `tools:streamChunk`: Streaming tool execution chunks (future)

### MCP Client Functions

- `connectToMCPServer(config)`: Connect and discover tools
- `disconnectMCPServer(serverName)`: Disconnect from server
- `executeMCPTool(serverName, toolName, parameters)`: Execute tool
- `executeMCPToolStream(serverName, toolName, parameters, onChunk)`: Execute with streaming
- `testMCPServerConnection(config)`: Test without saving
- `disconnectAllMCPServers()`: Cleanup on shutdown

## Security Considerations

### Stdio Transport

- MCP servers run as child processes
- Environment variables can be passed for authentication
- Server code runs in isolated process

### SSE Transport

- Server URL should use HTTPS in production
- No built-in authentication (use reverse proxy)
- Connection timeout applies

### Tool Execution

- MCP tools execute with same permissions as the app
- File system access is not sandboxed
- Network access depends on MCP server implementation

## Troubleshooting

### Connection Failures

1. **Invalid command/path**: Verify the command exists in PATH or use absolute path
2. **Missing dependencies**: Ensure MCP server dependencies are installed
3. **Port conflicts**: For SSE transport, verify the port is available

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
- Automatic reconnection with exponential backoff
- Tool caching for offline operation
