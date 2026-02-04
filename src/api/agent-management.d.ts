/**
 * Agent Management Type Definitions
 * Contains all types and interfaces related to agent management functionality
 */

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

// Import tool types from tool-management.d.ts for ToolCallEvent
import type { ToolCallEvent } from './tool-management.d';

/**
 * Agent Management API interface
 * Defines the contract for agent management operations
 * Used by renderer components to interact with agent management functionality
 */
export interface AgentManagementAPI {
  /**
   * Get all agents for a project
   * @param projectPath - Full path to the project folder
   * @returns Promise resolving to array of agents
   */
  getAgents(projectPath: string): Promise<Agent[]>;

  /**
   * Add a new agent to a project
   * @param projectPath - Full path to the project folder
   * @param agent - Agent configuration to add
   * @returns Promise resolving to updated array of agents
   */
  addAgent(projectPath: string, agent: Agent): Promise<Agent[]>;

  /**
   * Remove an agent from a project
   * @param projectPath - Full path to the project folder
   * @param agentName - Name of the agent to remove
   * @returns Promise resolving to updated array of agents
   */
  removeAgent(projectPath: string, agentName: string): Promise<Agent[]>;

  /**
   * Update an existing agent
   * @param projectPath - Full path to the project folder
   * @param agentName - Current name of the agent to update
   * @param agent - Updated agent configuration
   * @returns Promise resolving to updated agent
   */
  updateAgent(projectPath: string, agentName: string, agent: Agent): Promise<Agent>;

  /**
   * Clear chat-agent history
   * @param projectPath - Full path to the project folder
   * @param agentName - Name of the agent
   * @returns Promise resolving to success status
   */
  clearChatAgentHistory(projectPath: string, agentName: string): Promise<{ success: boolean }>;

  /**
   * Stream chat-agent message with callbacks
   * @param projectPath - Full path to the project folder
   * @param agentName - Name of the agent
   * @param message - User message to send
   * @param filePaths - Optional array of file paths to include as context
   * @param onChunk - Callback for streaming text chunks
   * @param onReasoning - Callback for reasoning content
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback when an error occurs
   * @returns Promise that resolves when streaming is set up
   */
  streamChatAgentMessage(
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void>;

  /**
   * Clear app-agent history
   * @param projectPath - Full path to the project folder
   * @param agentName - Name of the agent
   * @returns Promise resolving to success status
   */
  clearAppAgentHistory(projectPath: string, agentName: string): Promise<{ success: boolean }>;

  /**
   * Stream app-agent message with callbacks
   * @param projectPath - Full path to the project folder
   * @param agentName - Name of the agent
   * @param message - User message to send
   * @param filePaths - Optional array of file paths to include as context
   * @param onChunk - Callback for streaming text chunks
   * @param onReasoning - Callback for reasoning content
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback when an error occurs
   * @returns Promise that resolves when streaming is set up
   */
  streamAppAgentMessage(
    projectPath: string,
    agentName: string,
    message: string,
    filePaths: string[] | undefined,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void>;

  /**
   * Listen for tool call events during chat-agent streaming
   * @param callback - Function to call when tool call events occur
   */
  onToolCallEvent(callback: (event: ToolCallEvent) => void): void;
}
