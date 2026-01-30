// Global TypeScript declarations for Turbo Carnival

/**
 * Project interface representing a folder on disk
 */
export interface Project {
  path: string;      // Full absolute path to the folder
  name: string;      // Folder name only (e.g., "my-project")
  addedAt: number;   // Timestamp when added (for sorting)
}

/**
 * Agent interface representing an AI agent configuration
 */
export interface Agent {
  name: string;                    // Unique agent name
  type: string;                    // Agent type: "chat", "code", "assistant", etc.
  description: string;             // Human-readable description
  config: AgentConfig;             // Model configuration
  prompts: AgentPrompts;           // System and user prompts
  history: any[];                  // Conversation history (flexible type to support different message formats)
  settings: AgentSettings;         // Additional settings
}

/**
 * Agent model configuration
 */
export interface AgentConfig {
  modelId?: string;              // Reference to ModelConfig (NEW - primary way)
  providerId?: string;           // Reference to LLM provider by ID
  model?: string;                // Direct model string (DEPRECATED - use modelId instead)
  temperature?: number;          // DEPRECATED - use modelId instead
  maxTokens?: number;            // DEPRECATED - use modelId instead
  topP?: number;                 // DEPRECATED - use modelId instead
}

/**
 * Agent prompts
 */
export interface AgentPrompts {
  system?: string;                 // System prompt
  user?: string;                   // Default user prompt
}

/**
 * Additional agent settings
 */
export interface AgentSettings {
  [key: string]: any;              // Flexible settings object
}

/**
 * Generated App interface representing a JavaScript + HTML application
 */
export interface App {
  name: string;                    // App name (matches agent name)
  agentName: string;               // Link to parent agent
  html: string;                    // HTML content for the app
  rendererCode: string;            // JavaScript code to run in renderer process
  mainCode: string;                // JavaScript code to run in main process
  data: Record<string, any>;       // Persistent data storage for the app
  createdAt: number;               // Timestamp when created
  updatedAt: number;               // Timestamp when last updated
}

/**
 * LLM Provider type discriminator
 */
export type LLMProviderType = 'openai' | 'glm' | 'azure' | 'custom';

/**
 * LLM Provider configuration
 */
export interface LLMProvider {
  id: string;                    // Unique identifier (e.g., "openai-main")
  type: LLMProviderType;         // Provider type discriminator
  name: string;                  // Display name
  apiKey: string;                // API key/secret
  baseURL?: string;              // Custom endpoint (overrides default)
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}

/**
 * Model configuration for reusing model settings across agents
 */
export interface ModelConfig {
  id: string;                    // Unique identifier (e.g., "gpt4-creative")
  name: string;                  // Display name (e.g., "GPT-4 Creative")
  model: string;                 // Model identifier (e.g., "gpt-4", "claude-3.5")
  type: LLMProviderType;         // Provider type discriminator (openai, glm, azure, custom)
  temperature?: number;          // Optional temperature (0-2)
  maxTokens?: number;            // Optional max tokens
  topP?: number;                 // Optional top_p (0-1)
  extra?: Record<string, any>;   // Model-specific properties (e.g., thinking mode)
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}

/**
 * App settings for user preferences
 */
export interface AppSettings {
  theme: 'light' | 'dark';  // Theme preference
}

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
  result: any;                     // Return value from tool execution
  error?: string;                  // Error message if failed
  executionTime: number;           // Execution time in milliseconds
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
 * File system node type discriminator
 */
export type FileType = 'file' | 'directory';

/**
 * Represents a node in the file tree (file or directory)
 */
export interface FileTreeNode {
  name: string;              // File/directory name with extension
  path: string;              // Full absolute path
  type: FileType;            // 'file' or 'directory'
  children?: FileTreeNode[]; // Only present for directories
  expanded?: boolean;        // UI state: whether directory is expanded
}

/**
 * Options for file tree traversal
 */
export interface FileTreeOptions {
  maxDepth?: number;           // Maximum recursion depth (default: unlimited)
  excludeHidden?: boolean;     // Filter out hidden files (default: true)
  includeExtensions?: string[]; // Only include certain extensions (optional)
}

/**
 * File reference for @mention in chat
 */
export interface FileReference {
  name: string;        // File name (e.g., "README.md")
  path: string;        // Full absolute path
  extension: string;   // File extension (e.g., ".md", ".txt")
}

/**
 * File content with metadata
 */
export interface FileContent {
  path: string;        // Full absolute path
  name: string;        // File name
  content: string;     // File content as text
  size: number;        // File size in bytes
  error?: string;      // Error message if read failed
}

/**
 * Options for file listing
 */
export interface FileListOptions {
  extensions?: string[];  // Filter by extensions (e.g., ['.txt', '.md'])
  maxDepth?: number;      // Maximum directory depth to search
  excludeHidden?: boolean; // Exclude hidden files (default: true)
}

interface ElectronAPI {
  platform: string;
  openFolderDialog: () => Promise<string | null>;
  getProjects: () => Promise<Project[]>;
  addProject: (path: string) => Promise<Project[]>;
  removeProject: (path: string) => Promise<Project[]>;

  // Settings management
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;

  // Agent-related methods
  getAgents: (projectPath: string) => Promise<Agent[]>;
  addAgent: (projectPath: string, agent: Agent) => Promise<Agent[]>;
  removeAgent: (projectPath: string, agentName: string) => Promise<Agent[]>;
  updateAgent: (projectPath: string, agentName: string, agent: Agent) => Promise<Agent>;

  // LLM Provider management
  getProviders: () => Promise<LLMProvider[]>;
  addProvider: (provider: LLMProvider) => Promise<LLMProvider[]>;
  updateProvider: (id: string, provider: LLMProvider) => Promise<LLMProvider[]>;
  removeProvider: (id: string) => Promise<LLMProvider[]>;
  getProviderById: (id: string) => Promise<LLMProvider>;

  // Model Config management
  getModelConfigs: () => Promise<ModelConfig[]>;
  addModelConfig: (config: ModelConfig) => Promise<ModelConfig[]>;
  updateModelConfig: (id: string, config: ModelConfig) => Promise<ModelConfig[]>;
  removeModelConfig: (id: string) => Promise<ModelConfig[]>;
  getModelConfigById: (id: string) => Promise<ModelConfig>;

  // Tool management
  getTools: () => Promise<Tool[]>;
  addTool: (tool: Tool) => Promise<Tool[]>;
  updateTool: (toolName: string, tool: Tool) => Promise<Tool>;
  removeTool: (toolName: string) => Promise<Tool[]>;
  executeTool: (request: ToolExecutionRequest) => Promise<ToolExecutionResult>;

  // Browser tool execution events
  onBrowserToolExecution: (
    callback: (request: {
      code: string;
      parameters: Record<string, any>;
      timeout: number
    }) => void
  ) => void;

  sendBrowserToolResult: (result: {
    success: boolean;
    result?: any;
    error?: string;
    executionTime: number
  }) => void;

  // ============ CHAT-AGENT METHODS ============

  // Clear chat-agent history
  clearChatAgentHistory: (projectPath: string, agentName: string) => Promise<{ success: boolean }>;

  // Send chat-agent message (non-streaming)
  sendChatAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths?: string[]
  ) => Promise<any>;

  // Stream chat-agent message
  streamChatAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;

  // ============ APP-AGENT METHODS ============

  // Clear app-agent history
  clearAppAgentHistory: (projectPath: string, agentName: string) => Promise<{ success: boolean }>;

  // Send app-agent message (non-streaming)
  sendAppAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths?: string[]
  ) => Promise<any>;

  // Stream app-agent message
  streamAppAgentMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;

  // Project detail methods
  getFileTree: (projectPath: string, options?: FileTreeOptions) => Promise<FileTreeNode[]>;

  // File reading methods
  listProjectFiles: (projectPath: string, options?: FileListOptions) => Promise<FileReference[]>;
  readFileContent: (filePath: string) => Promise<FileContent>;
  readFileContents: (filePaths: string[]) => Promise<FileContent[]>;

  // Save message to file
  saveMessageToFile: (projectPath: string, content: string) => Promise<string | null>;

  // Listen for project file updates
  onProjectFileUpdated: (callback: (data: { projectPath: string; filePath: string }) => void) => void;

  // Tool call events for chat-agent streaming
  onToolCallEvent: (callback: (event: ToolCallEvent) => void) => void;

  // App management methods
  getApp: (projectPath: string, agentName: string) => Promise<App | null>;
  saveApp: (projectPath: string, app: App) => Promise<void>;
  deleteApp: (projectPath: string, agentName: string) => Promise<void>;
  executeAppMain: (projectPath: string, agentName: string, functionName: string, args: any[]) => Promise<any>;
  updateAppData: (projectPath: string, agentName: string, data: Record<string, any>) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
