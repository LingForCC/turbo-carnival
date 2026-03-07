/**
 * Shared types for conversation module
 * Extracted to avoid circular dependencies between components and transformers
 */

/**
 * Tool call data for conversation panel display
 */
export interface ToolCallData {
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  executionTime?: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Chat message for UI display in conversation-panel
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCall?: ToolCallData;
  reasoning?: string;  // GLM reasoning/thinking content
}
