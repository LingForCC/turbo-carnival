/**
 * Provider Management Type Definitions
 * Contains all types and interfaces related to LLM provider and model configuration management
 */

/**
 * LLM Provider type discriminator
 */
export type LLMProviderType = 'openai' | 'glm' | 'azure' | 'custom';

/**
 * LLM Provider configuration
 * Represents a single provider with its credentials and settings
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
 * LLM Provider Feature Settings
 * Stored in feature settings under 'llm-providers'
 */
export interface LLMProviderFeatureSettings {
  providers: LLMProvider[];
}

/**
 * LLM Model Feature Settings
 * Stored in feature settings under 'llm-model-configs'
 */
export interface LLMModelFeatureSettings {
  modelConfigs: ModelConfig[];
}

// Type aliases for settings registration
export type LLMProviderSettings = LLMProvider;
export type LLMModelSettings = ModelConfig;
