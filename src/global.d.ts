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
  history: ConversationMessage[];  // Conversation history
  settings: AgentSettings;         // Additional settings
}

/**
 * Agent model configuration
 */
export interface AgentConfig {
  model: string;                   // e.g., "claude-3.5", "gpt-4"
  temperature?: number;            // Default: 0.7
  maxTokens?: number;              // Optional token limit
  topP?: number;                   // Optional nucleus sampling
  apiConfig?: APIConfig;           // API configuration
}

/**
 * Agent prompts
 */
export interface AgentPrompts {
  system?: string;                 // System prompt
  user?: string;                   // Default user prompt
}

/**
 * Conversation message for history
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Additional agent settings
 */
export interface AgentSettings {
  [key: string]: any;              // Flexible settings object
}

/**
 * API configuration for OpenAI-compatible endpoints
 */
export interface APIConfig {
  baseURL?: string;              // Custom API endpoint (e.g., "https://api.openai.com/v1")
  apiKeyRef?: string;            // Reference to named API key in global storage
  timeout?: number;              // Request timeout in milliseconds (default: 60000)
}

/**
 * Named API key for global storage
 */
export interface APIKey {
  name: string;                  // Unique identifier (e.g., "openai-main", "local-llm")
  apiKey: string;                // The actual API key
  baseURL?: string;              // Optional default endpoint for this key
  createdAt: number;             // Timestamp
}

interface ElectronAPI {
  platform: string;
  openFolderDialog: () => Promise<string | null>;
  getProjects: () => Promise<Project[]>;
  addProject: (path: string) => Promise<Project[]>;
  removeProject: (path: string) => Promise<Project[]>;

  // Agent-related methods
  getAgents: (projectPath: string) => Promise<Agent[]>;
  addAgent: (projectPath: string, agent: Agent) => Promise<Agent[]>;
  removeAgent: (projectPath: string, agentName: string) => Promise<Agent[]>;
  updateAgent: (projectPath: string, agentName: string, agent: Agent) => Promise<Agent>;

  // API key management
  getAPIKeys: () => Promise<APIKey[]>;
  addAPIKey: (apiKey: APIKey) => Promise<APIKey[]>;
  removeAPIKey: (name: string) => Promise<APIKey[]>;

  // Chat completion (non-streaming)
  sendChatMessage: (
    projectPath: string,
    agentName: string,
    message: string
  ) => Promise<any>;

  // Chat completion (streaming)
  streamChatMessage: (
    projectPath: string,
    agentName: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
