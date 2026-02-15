/**
 * Tool Management Type Definitions
 * Contains all types and interfaces related to tool management functionality
 */

/**
 * JSON Schema definition for tool parameters and return values
 * Follows JSON Schema draft-07 specification
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  minLength?: number;
  [key: string]: any; // Allow additional JSON Schema keywords
}

/**
 * Custom Tool that can be invoked by AI agents
 */
export interface Tool {
  name: string;                    // Unique tool identifier
  description: string;             // Human-readable description (shown to agent in system prompt)
  code: string;                    // JavaScript code to execute (must export function named "tool" or "run")
  parameters: JSONSchema;          // JSON Schema for input parameter validation
  returns?: JSONSchema;            // JSON Schema for output structure (shown to agent)
  timeout?: number;                // Execution timeout in milliseconds (default: 30000)
  enabled: boolean;                // Whether tool is enabled for use
  environment?: 'node' | 'browser'; // Execution environment (default: 'node')
  createdAt: number;               // Timestamp when created
  updatedAt?: number;              // Timestamp when last updated
  toolType?: 'custom' | 'mcp';     // Tool type (default: 'custom')
  mcpServerName?: string;          // For MCP tools: server name
  mcpToolName?: string;            // For MCP tools: original tool name from MCP server
  isStreamable?: boolean;          // For MCP tools: whether tool supports streaming
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  tool?: Tool;  // Optional: Full tool data for direct execution (e.g., testing unsaved tools)
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  result?: any;                    // Return value from tool execution (only when success: true)
  error?: string;                  // Error message if failed
  executionTime: number;           // Execution time in milliseconds
}

/**
 * Browser tool execution request
 * Sent from main process to renderer for browser tool execution
 */
export interface BrowserToolExecutionRequest {
  code: string;
  parameters: Record<string, any>;
  timeout: number;
}

/**
 * Tool call event for IPC communication
 * Sent from main process to renderer during tool execution
 */
export interface ToolCallEvent {
  toolName: string;
  parameters: Record<string, any>;
  status: 'started' | 'completed' | 'failed';
  result?: any;
  executionTime?: number;
  error?: string;
}

/**
 * Tool Management API interface
 * Defines the contract for tool management operations
 * Used by renderer components to interact with tool management functionality
 */
export interface ToolManagementAPI {
  /**
   * Get all tools
   * @returns Promise resolving to array of tools
   */
  getTools(): Promise<Tool[]>;

  /**
   * Add a new tool
   * @param tool - Tool object to add
   * @returns Promise resolving to updated array of tools
   */
  addTool(tool: Tool): Promise<Tool[]>;

  /**
   * Update an existing tool
   * @param toolName - Name of the tool to update
   * @param tool - Updated tool object
   * @returns Promise resolving to updated tool
   */
  updateTool(toolName: string, tool: Tool): Promise<Tool>;

  /**
   * Remove a tool
   * @param toolName - Name of the tool to remove
   * @returns Promise resolving to updated array of tools
   */
  removeTool(toolName: string): Promise<Tool[]>;

  /**
   * Execute a tool
   * @param request - Tool execution request
   * @returns Promise resolving to tool execution result
   */
  executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult>;

  /**
   * Listen for browser tool execution requests from main process
   * @param callback - Function to call when browser tool execution is requested
   */
  onBrowserToolExecution(callback: (request: BrowserToolExecutionRequest) => void): void;

  /**
   * Send browser tool execution result back to main process
   * @param result - Browser tool execution result
   */
  sendBrowserToolResult(result: ToolExecutionResult): void;

  /**
   * Get all MCP server configurations
   * @returns Promise resolving to array of MCP server configs
   */
  getMCPServers(): Promise<MCPServerConfig[]>;

  /**
   * Add a new MCP server configuration
   * @param config - MCP server configuration
   * @returns Promise resolving to updated array of MCP server configs
   */
  addMCPServer(config: MCPServerConfig): Promise<MCPServerConfig[]>;

  /**
   * Update an existing MCP server configuration
   * @param name - Name of the MCP server to update
   * @param config - Updated MCP server configuration
   * @returns Promise resolving to updated array of MCP server configs
   */
  updateMCPServer(name: string, config: MCPServerConfig): Promise<MCPServerConfig[]>;

  /**
   * Remove an MCP server configuration
   * @param name - Name of the MCP server to remove
   * @returns Promise resolving to updated array of MCP server configs
   */
  removeMCPServer(name: string): Promise<MCPServerConfig[]>;

  /**
   * Test connection to an MCP server (without saving)
   * @param config - MCP server configuration to test
   * @returns Promise resolving to discovered tools
   */
  testMCPServer(config: MCPServerConfig): Promise<Tool[]>;

  /**
   * Reconnect to an MCP server
   * @param name - Name of the MCP server to reconnect
   * @returns Promise resolving to discovered tools
   */
  reconnectMCPServer(name: string): Promise<Tool[]>;

  /**
   * Disconnect from an MCP server
   * @param name - Name of the MCP server to disconnect
   * @returns Promise that resolves when disconnection is complete
   */
  disconnectMCPServer(name: string): Promise<void>;

  /**
   * Listen for streaming tool execution chunks
   * @param callback - Function to call when streaming chunk is received
   */
  onToolStreamChunk(callback: (chunk: { toolName: string; chunk: string }) => void): void;
}

/**
 * MCP Server Configuration
 * Note: connected, toolCount, and lastConnected are runtime-only fields and NOT persisted to storage
 */
export interface MCPServerConfig {
  name: string;                    // Unique server identifier
  transport: 'stdio' | 'streamable-http';      // Transport type
  command?: string;                // Command for stdio transport
  args?: string[];                 // Arguments for stdio command
  url?: string;                    // URL for streamable-http transport
  env?: Record<string, string>;    // Environment variables for stdio
  headers?: Record<string, string>; // HTTP headers for streamable-http transport
  connected?: boolean;             // Runtime-only: Connection status (NOT saved)
  toolCount?: number;              // Runtime-only: Number of discovered tools (NOT saved)
  lastConnected?: number;          // Runtime-only: Timestamp of last connection (NOT saved)
}

/**
 * MCP Storage format
 */
export interface MCPStorage {
  mcpServers: MCPServerConfig[];
}
