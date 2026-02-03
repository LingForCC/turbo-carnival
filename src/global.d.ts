// Global TypeScript declarations for Turbo Carnival

// Import project management types for use in ElectronAPI interface
import type {
  Project,
  FileTreeOptions,
  FileListOptions,
  FileTreeNode,
  FileReference,
  FileContent
} from './api/project-management.d';

// Import agent management types for use in ElectronAPI interface
import type { Agent } from './api/agent-management.d';


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
    onReasoning: (reasoning: string) => void,
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
    onReasoning: (reasoning: string) => void,
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
