/**
 * Quick AI Management Type Definitions
 * Contains all types and interfaces related to Quick AI functionality
 */

// Import Agent type from agent-management
import type { Agent } from './agent-management';

/**
 * Settings validation result
 */
export interface QuickAISettingsValidation {
  valid: boolean;
  error?: string;
}

/**
 * Quick AI Management API interface
 * Defines the contract for Quick AI operations
 * Used by renderer components to interact with Quick AI functionality
 */
export interface QuickAIManagementAPI {
  /**
   * Get the in-memory Quick AI agent
   * @returns Promise resolving to the Quick AI agent
   */
  getAgent(): Promise<Agent>;

  /**
   * Stream AI response with callbacks
   * @param message - User message to send
   * @param onChunk - Callback for streaming text chunks
   * @param onReasoning - Callback for reasoning content
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback when an error occurs
   * @returns Promise that resolves when streaming is set up
   */
  streamMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ): Promise<string>;

  /**
   * Clear Quick AI conversation history
   * @returns Promise resolving to success status
   */
  clearHistory(): Promise<{ success: boolean }>;

  /**
   * Validate Quick AI settings
   * Checks if default provider and model config are configured
   * @returns Promise resolving to validation result
   */
  validateSettings(): Promise<QuickAISettingsValidation>;

  /**
   * Register callback for when Quick AI window is shown
   * @param callback - Function to call when window is shown
   * @returns Unsubscribe function to remove the listener
   */
  onWindowShown(callback: () => void): () => void;
}
