/**
 * MCP Storage Module
 * Handles storage of MCP server configurations in tools.json
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { MCPServerConfig } from '../types';

/**
 * Get the file path for tools storage
 */
function getToolsPath(): string {
  return path.join(app.getPath('userData'), 'tools.json');
}

/**
 * Load tools storage file
 */
function loadToolsStorage(): { tools: any[]; mcpServers?: MCPServerConfig[] } {
  const toolsPath = getToolsPath();
  if (fs.existsSync(toolsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));
      return data;
    } catch (error) {
      console.error('Failed to load tools storage:', error);
      return { tools: [] };
    }
  }
  return { tools: [] };
}

/**
 * Save tools storage file
 */
function saveToolsStorage(data: { tools: any[]; mcpServers?: MCPServerConfig[] }): void {
  const toolsPath = getToolsPath();
  try {
    fs.writeFileSync(toolsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save tools storage:', error);
  }
}

/**
 * Load all MCP server configurations
 */
export function loadMCPServers(): MCPServerConfig[] {
  const storage = loadToolsStorage();
  return storage.mcpServers || [];
}

/**
 * Save all MCP server configurations
 */
export function saveMCPServers(servers: MCPServerConfig[]): void {
  const storage = loadToolsStorage();
  storage.mcpServers = servers;
  saveToolsStorage(storage);
}

/**
 * Add a new MCP server configuration
 */
export function addMCPServer(config: MCPServerConfig): MCPServerConfig[] {
  const servers = loadMCPServers();

  // Check for duplicate names
  if (servers.some(s => s.name === config.name)) {
    throw new Error(`MCP server with name "${config.name}" already exists`);
  }

  // Validate configuration
  const validationError = validateMCPServerConfig(config);
  if (validationError) {
    throw new Error(validationError);
  }

  servers.push(config);
  saveMCPServers(servers);
  return servers;
}

/**
 * Update an existing MCP server configuration
 */
export function updateMCPServer(name: string, config: MCPServerConfig): MCPServerConfig[] {
  const servers = loadMCPServers();
  const index = servers.findIndex(s => s.name === name);

  if (index === -1) {
    throw new Error(`MCP server "${name}" not found`);
  }

  // If name changed, check for conflicts
  if (config.name !== name) {
    if (servers.some(s => s.name === config.name)) {
      throw new Error(`MCP server with name "${config.name}" already exists`);
    }
  }

  // Validate configuration
  const validationError = validateMCPServerConfig(config);
  if (validationError) {
    throw new Error(validationError);
  }

  servers[index] = config;
  saveMCPServers(servers);
  return servers;
}

/**
 * Remove an MCP server configuration
 */
export function removeMCPServer(name: string): MCPServerConfig[] {
  const servers = loadMCPServers();
  const filtered = servers.filter(s => s.name !== name);
  saveMCPServers(filtered);
  return filtered;
}

/**
 * Get a single MCP server by name
 */
export function getMCPServerByName(name: string): MCPServerConfig | undefined {
  const servers = loadMCPServers();
  return servers.find(s => s.name === name);
}

/**
 * Validate MCP server configuration
 */
export function validateMCPServerConfig(config: any): string | null {
  if (!config.name || typeof config.name !== 'string') {
    return 'Server name is required and must be a string';
  }

  if (!config.transport || typeof config.transport !== 'string') {
    return 'Transport type is required and must be a string';
  }

  if (config.transport !== 'stdio' && config.transport !== 'streamable-http') {
    return 'Transport must be either "stdio" or "streamable-http"';
  }

  if (config.transport === 'stdio') {
    if (!config.command || typeof config.command !== 'string') {
      return 'stdio transport requires a command';
    }
    if (config.args && !Array.isArray(config.args)) {
      return 'args must be an array';
    }
  }

  if (config.transport === 'streamable-http') {
    if (!config.url || typeof config.url !== 'string') {
      return 'streamable-http transport requires a url';
    }
    try {
      new URL(config.url);
    } catch {
      return 'url must be a valid URL';
    }
  }

  if (config.env && typeof config.env !== 'object') {
    return 'env must be an object';
  }

  if (config.headers && typeof config.headers !== 'object') {
    return 'headers must be an object';
  }

  // Validate header values are strings
  if (config.headers && typeof config.headers === 'object') {
    for (const [key, value] of Object.entries(config.headers)) {
      if (typeof value !== 'string') {
        return `Header value for "${key}" must be a string`;
      }
    }
  }

  return null; // Validation passed
}
