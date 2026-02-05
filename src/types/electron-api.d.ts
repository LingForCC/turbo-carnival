// Global TypeScript declarations for Turbo Carnival

// Import project management types for use in ElectronAPI interface
import type {
  Project,
  FileTreeOptions,
  FileListOptions,
  FileTreeNode,
  FileReference,
  FileContent
} from './project-management';

// Import agent management types for use in ElectronAPI interface
import type { Agent } from './agent-management';

// Import provider management types for use in ElectronAPI interface
import type { LLMProvider, ModelConfig } from './provider-management';

// Import tool management types for use in ElectronAPI interface
import type { Tool, ToolExecutionRequest, ToolExecutionResult, ToolCallEvent } from './tool-management';

// Import settings types for use in ElectronAPI interface
import type { AppSettings } from './settings-management';

interface ElectronAPI {
  platform: string;
  openFolderDialog: () => Promise<string | null>;
  getProjects: () => Promise<Project[]>;
  addProject: (path: string) => Promise<Project[]>;
  removeProject: (path: string) => Promise<Project[]>;

  // Settings management
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Record<string, any>) => Promise<AppSettings>;

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
