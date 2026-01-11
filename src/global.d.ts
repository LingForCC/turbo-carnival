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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
