/**
 * MCP Client Module
 * Handles connections to MCP servers, tool discovery, and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '../types/tool-management';
import type { MCPServerConfig } from '../types/tool-management';

// Active MCP client connections
const activeClients = new Map<string, Client>();

/**
 * Connect to an MCP server and discover tools
 */
export async function connectToMCPServer(config: MCPServerConfig): Promise<Tool[]> {
  console.log(`[MCP] Connecting to server "${config.name}" with transport: ${config.transport}`);

  const client = new Client({
    name: 'turbo-carnival',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    // Create transport based on type
    let transport;
    if (config.transport === 'stdio') {
      if (!config.command) {
        throw new Error('stdio transport requires a command');
      }
      console.log(`[MCP] ${config.name}: Creating stdio transport with command: ${config.command}`);
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env
      });
    } else if (config.transport === 'streamable-http') {
      if (!config.url) {
        throw new Error('streamable-http transport requires a url');
      }
      console.log(`[MCP] ${config.name}: Creating streamable-http transport to URL: ${config.url}`);
      if (config.headers) {
        console.log(`[MCP] ${config.name}: Using headers:`, Object.keys(config.headers));
      }
      // Create StreamableHTTP transport with custom headers support
      const transportOptions: any = {
        requestInit: {}
      };
      if (config.headers) {
        transportOptions.requestInit.headers = config.headers;
      }
      transport = new StreamableHTTPClientTransport(new URL(config.url), transportOptions);
    } else {
      throw new Error(`Unsupported transport type: ${config.transport}. Supported types are: stdio, streamable-http`);
    }

    // Connect to server
    console.log(`[MCP] ${config.name}: Connecting...`);
    await client.connect(transport);
    console.log(`[MCP] ${config.name}: Connected successfully`);

    // List available tools
    const toolsResponse = await client.listTools();
    const mcpTools = toolsResponse.tools || [];
    console.log(`[MCP] ${config.name}: Discovered ${mcpTools.length} tools:`, mcpTools.map(t => t.name));

    // Convert MCP tools to Tool format
    const tools: Tool[] = mcpTools.map((mcpTool: any) => ({
      name: `${config.name}__${mcpTool.name}`,
      description: mcpTool.description || `Tool from ${config.name}`,
      code: '', // MCP tools don't have custom code
      parameters: mcpTool.inputSchema || { type: 'object', properties: {} },
      timeout: 60000, // Default timeout for MCP tools
      enabled: true,
      environment: 'node',
      createdAt: Date.now(),
      toolType: 'mcp',
      mcpServerName: config.name,
      mcpToolName: mcpTool.name,
      isStreamable: config.transport === 'streamable-http' // Mark as streamable for streamable-http
    }));

    console.log(`[MCP] ${config.name}: Converted ${tools.length} tools to internal format`);
    console.log(`[MCP] ${config.name}: Tools are ENABLED:`, tools.map(t => ({ name: t.name, enabled: t.enabled })));

    // Store client for later use
    activeClients.set(config.name, client);
    console.log(`[MCP] ${config.name}: Client stored for later use`);

    return tools;
  } catch (error: any) {
    console.error(`[MCP] ${config.name}: Connection failed:`, error);
    await client.close();
    throw new Error(`Failed to connect to MCP server "${config.name}": ${error.message}`);
  }
}

/**
 * Disconnect from an MCP server
 */
export async function disconnectMCPServer(serverName: string): Promise<void> {
  const client = activeClients.get(serverName);
  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.error(`Error closing MCP client for ${serverName}:`, error);
    }
    activeClients.delete(serverName);
  }
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(
  serverName: string,
  toolName: string,
  parameters: Record<string, any>
): Promise<any> {
  console.log(`[MCP] Executing tool: server="${serverName}", tool="${toolName}"`);
  console.log(`[MCP] Tool parameters:`, parameters);

  const client = activeClients.get(serverName);
  if (!client) {
    console.error(`[MCP] ERROR: MCP server "${serverName}" is not connected`);
    console.log(`[MCP] Active clients:`, Array.from(activeClients.keys()));
    throw new Error(`MCP server "${serverName}" is not connected`);
  }

  console.log(`[MCP] Client found for server "${serverName}"`);

  try {
    console.log(`[MCP] Calling tool "${toolName}" on server "${serverName}"...`);
    const result = await client.callTool({
      name: toolName,
      arguments: parameters
    });
    console.log(`[MCP] Tool "${toolName}" executed successfully`);
    console.log(`[MCP] Result:`, result);

    return result;
  } catch (error: any) {
    console.error(`[MCP] ERROR: Tool execution failed for "${toolName}":`, error);
    throw new Error(`MCP tool execution failed: ${error.message}`);
  }
}

/**
 * Execute an MCP tool with streaming
 */
export async function executeMCPToolStream(
  serverName: string,
  toolName: string,
  parameters: Record<string, any>,
  onChunk: (chunk: string) => void
): Promise<any> {
  const client = activeClients.get(serverName);
  if (!client) {
    throw new Error(`MCP server "${serverName}" is not connected`);
  }

  try {
    // Check if tool supports streaming by attempting to call it
    const result = await client.callTool({
      name: toolName,
      arguments: parameters
    });

    // For now, return the result directly
    // Future: Implement actual streaming when MCP SDK adds streaming support
    return result;
  } catch (error: any) {
    throw new Error(`MCP tool execution failed: ${error.message}`);
  }
}

/**
 * Test connection to an MCP server without saving
 */
export async function testMCPServerConnection(config: MCPServerConfig): Promise<Tool[]> {
  // Connect and discover tools, then disconnect
  const tools = await connectToMCPServer(config);
  await disconnectMCPServer(config.name);
  return tools;
}

/**
 * Disconnect from all MCP servers
 */
export async function disconnectAllMCPServers(): Promise<void> {
  const disconnectPromises = Array.from(activeClients.keys()).map(name =>
    disconnectMCPServer(name)
  );
  await Promise.all(disconnectPromises);
}

/**
 * Check if an MCP server is connected
 */
export function isMCPServerConnected(serverName: string): boolean {
  return activeClients.has(serverName);
}
