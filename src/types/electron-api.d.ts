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

// Import notepad types for use in ElectronAPI interface
import type { NotepadFile } from './notepad-management';

// Import agent template types for use in ElectronAPI interface
import type { AgentTemplate } from './agent-template';

// Import Quick AI types for use in ElectronAPI interface
import type { QuickAISettingsValidation } from './quick-ai-management';

// Import snippet types for use in ElectronAPI interface
import type { SnippetFile } from './snippet-management';

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

  // ============ AGENT TEMPLATE METHODS ============

  // Get all agent templates
  getTemplates: () => Promise<AgentTemplate[]>;

  // Add a new template
  addTemplate: (template: AgentTemplate) => Promise<void>;

  // Update an existing template
  updateTemplate: (id: string, template: AgentTemplate) => Promise<void>;

  // Remove a template
  removeTemplate: (id: string) => Promise<void>;

  // Get template by ID
  getTemplateById: (id: string) => Promise<AgentTemplate | null>;

  // ============ NOTEPAD METHODS ============

  // Get list of notepad files
  getFiles: () => Promise<NotepadFile[]>;

  // Read notepad file content
  readFile: (filePath: string) => Promise<string>;

  // Create new notepad file
  createFile: () => Promise<NotepadFile>;

  // Save notepad content
  saveContent: (filePath: string, content: string) => Promise<void>;

  // Delete notepad file
  deleteFile: (filePath: string) => Promise<void>;

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

  // ============ QUICK AI METHODS ============

  // Get the in-memory Quick AI agent
  getQuickAIAgent: () => Promise<Agent>;

  // Stream Quick AI message
  streamQuickAIMessage: (
    message: string,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ) => Promise<string>;

  // Clear Quick AI history
  clearQuickAIHistory: () => Promise<{ success: boolean }>;

  // Validate Quick AI settings
  validateQuickAISettings: () => Promise<QuickAISettingsValidation>;

  // Listen for Quick AI window shown event
  onQuickAIWindowShown: (callback: () => void) => (() => void);

  // Listen for tool call events during Quick AI streaming
  onQuickAIToolCallEvent: (callback: (event: ToolCallEvent) => void) => void;

  // ============ SNIPPET METHODS ============

  // Get list of snippet files
  getSnippetFiles: () => Promise<SnippetFile[]>;

  // Read snippet file content
  readSnippetFile: (fileName: string) => Promise<string>;

  // Create new snippet file
  createSnippetFile: (name: string, content: string) => Promise<SnippetFile>;

  // Save snippet content
  saveSnippetContent: (fileName: string, content: string) => Promise<void>;

  // Rename snippet file
  renameSnippetFile: (oldName: string, newName: string) => Promise<void>;

  // Delete snippet file
  deleteSnippetFile: (fileName: string) => Promise<void>;

  // Close snippet window
  closeSnippetWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
