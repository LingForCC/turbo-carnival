import type { QuickAIManagementAPI, QuickAISettingsValidation } from '../types/quick-ai-management';

/**
 * Quick AI Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Quick AI Management API implementation for renderer components
 */
const apiInstance: QuickAIManagementAPI = {
  /**
   * Get the in-memory Quick AI agent
   */
  getAgent: () => {
    return getElectronAPI().getQuickAIAgent();
  },

  /**
   * Stream AI message with callbacks
   */
  streamMessage: (
    message: string,
    onChunk: (chunk: string) => void,
    onReasoning: (reasoning: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ) => {
    return getElectronAPI().streamQuickAIMessage(
      message,
      onChunk,
      onReasoning,
      onComplete,
      onError
    );
  },

  /**
   * Clear conversation history
   */
  clearHistory: () => {
    return getElectronAPI().clearQuickAIHistory();
  },

  /**
   * Validate settings
   */
  validateSettings: () => {
    return getElectronAPI().validateQuickAISettings();
  },

  /**
   * Register callback for when Quick AI window is shown
   */
  onWindowShown: (callback: () => void) => {
    return getElectronAPI().onQuickAIWindowShown(callback);
  },
};

/**
 * Get the QuickAIManagementAPI instance
 * Returns a singleton instance that implements QuickAIManagementAPI interface
 */
export function getQuickAIManagementAPI(): QuickAIManagementAPI {
  return apiInstance;
}

// Also export the instance directly for convenience
export const quickAIManagementAPI = apiInstance;

// Re-export types for convenience
export type { QuickAISettingsValidation };
