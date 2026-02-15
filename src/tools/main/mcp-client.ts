/**
 * MCP Client Module
 * Handles connections to MCP servers, tool discovery, and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, MCPServerConfig } from '../types';

// Active MCP client connections
const activeClients = new Map<string, Client>();

// In-memory storage for MCP tools (loaded at app startup)
const mcpToolsCache = new Map<string, Tool[]>();

/**
 * Connect to an MCP server and discover tools
 */
export async function connectToMCPServer(config: MCPServerConfig): Promise<Tool[]> {
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
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env
      });
    } else if (config.transport === 'streamable-http') {
      if (!config.url) {
        throw new Error('streamable-http transport requires a url');
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
    await client.connect(transport);

    // List available tools
    const toolsResponse = await client.listTools();
    const mcpTools = toolsResponse.tools || [];

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

    // Store client for later use
    activeClients.set(config.name, client);

    // Cache tools in memory
    mcpToolsCache.set(config.name, tools);

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
      console.error(`[MCP] Error closing MCP client for ${serverName}:`, error);
    }
    activeClients.delete(serverName);
  }

  // Clear tools cache for this server
  mcpToolsCache.delete(serverName);
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(
  serverName: string,
  toolName: string,
  parameters: Record<string, any>
): Promise<any> {
  const client = activeClients.get(serverName);
  if (!client) {
    throw new Error(`MCP server "${serverName}" is not connected`);
  }

  try {
    const result = await client.callTool({
      name: toolName,
      arguments: parameters
    });
    return result;
  } catch (error: any) {
    console.error(`[MCP] Tool execution failed for "${toolName}":`, error);
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

/**
 * Get all cached MCP tools from all servers
 */
export function getAllCachedMCPTools(): Tool[] {
  const allTools: Tool[] = [];
  for (const tools of mcpToolsCache.values()) {
    allTools.push(...tools);
  }
  return allTools;
}

/**
 * Clear all MCP tools cache
 */
export function clearMCPToolsCache(): void {
  mcpToolsCache.clear();
}

/**
 * Get the number of cached tools for a specific server
 */
export function getCachedToolCount(serverName: string): number {
  const tools = mcpToolsCache.get(serverName);
  return tools ? tools.length : 0;
}
