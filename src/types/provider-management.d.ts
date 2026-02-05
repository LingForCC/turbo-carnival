/**
 * Provider Management Type Definitions
 * Contains all types and interfaces related to LLM provider and model configuration management
 */

// Import tool types from tool-management.d.ts (avoid circular dependency with electron-api.d.ts)
import type { Tool, ToolExecutionRequest, ToolExecutionResult, ToolCallEvent } from './tool-management';

// Import AppSettings from settings-management.d.ts
import type { AppSettings } from './settings-management';

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
 * Provider Management API interface
 * Defines the contract for provider and model configuration operations
 * Used by renderer components to interact with provider management functionality
 */
export interface ProviderManagementAPI {
  /**
   * Get all providers
   * @returns Promise resolving to array of providers
   */
  getProviders(): Promise<LLMProvider[]>;

  /**
   * Add a new provider
   * @param provider - Provider configuration to add
   * @returns Promise resolving to updated array of providers
   */
  addProvider(provider: LLMProvider): Promise<LLMProvider[]>;

  /**
   * Update an existing provider
   * @param id - Provider ID to update
   * @param provider - Updated provider configuration
   * @returns Promise resolving to updated array of providers
   */
  updateProvider(id: string, provider: LLMProvider): Promise<LLMProvider[]>;

  /**
   * Remove a provider
   * @param id - Provider ID to remove
   * @returns Promise resolving to updated array of providers
   */
  removeProvider(id: string): Promise<LLMProvider[]>;

  /**
   * Get provider by ID
   * @param id - Provider ID
   * @returns Promise resolving to provider
   */
  getProviderById(id: string): Promise<LLMProvider>;

  /**
   * Get all model configs
   * @returns Promise resolving to array of model configs
   */
  getModelConfigs(): Promise<ModelConfig[]>;

  /**
   * Add a new model config
   * @param config - Model configuration to add
   * @returns Promise resolving to updated array of model configs
   */
  addModelConfig(config: ModelConfig): Promise<ModelConfig[]>;

  /**
   * Update an existing model config
   * @param id - Model config ID to update
   * @param config - Updated model configuration
   * @returns Promise resolving to updated array of model configs
   */
  updateModelConfig(id: string, config: ModelConfig): Promise<ModelConfig[]>;

  /**
   * Remove a model config
   * @param id - Model config ID to remove
   * @returns Promise resolving to updated array of model configs
   */
  removeModelConfig(id: string): Promise<ModelConfig[]>;

  /**
   * Get model config by ID
   * @param id - Model config ID
   * @returns Promise resolving to model config
   */
  getModelConfigById(id: string): Promise<ModelConfig>;
}
