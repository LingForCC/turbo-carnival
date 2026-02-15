import type { ProviderManagementAPI, LLMProvider, ModelConfig } from '../types';

/**
 * Provider Management API for Renderer Components
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
 * Provider Management API implementation for renderer components
 */
const apiInstance: ProviderManagementAPI = {
  /**
   * Get all providers
   */
  getProviders: () => {
    return getElectronAPI().getProviders();
  },

  /**
   * Add a new provider
   */
  addProvider: (provider: LLMProvider) => {
    return getElectronAPI().addProvider(provider);
  },

  /**
   * Update an existing provider
   */
  updateProvider: (id: string, provider: LLMProvider) => {
    return getElectronAPI().updateProvider(id, provider);
  },

  /**
   * Remove a provider
   */
  removeProvider: (id: string) => {
    return getElectronAPI().removeProvider(id);
  },

  /**
   * Get provider by ID
   */
  getProviderById: (id: string) => {
    return getElectronAPI().getProviderById(id);
  },

  /**
   * Get all model configs
   */
  getModelConfigs: () => {
    return getElectronAPI().getModelConfigs();
  },

  /**
   * Add a new model config
   */
  addModelConfig: (config: ModelConfig) => {
    return getElectronAPI().addModelConfig(config);
  },

  /**
   * Update an existing model config
   */
  updateModelConfig: (id: string, config: ModelConfig) => {
    return getElectronAPI().updateModelConfig(id, config);
  },

  /**
   * Remove a model config
   */
  removeModelConfig: (id: string) => {
    return getElectronAPI().removeModelConfig(id);
  },

  /**
   * Get model config by ID
   */
  getModelConfigById: (id: string) => {
    return getElectronAPI().getModelConfigById(id);
  },
};

/**
 * Get the ProviderManagementAPI instance
 * Returns a singleton instance that implements ProviderManagementAPI interface
 */
export function getProviderManagementAPI(): ProviderManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const providerManagementAPI = apiInstance;
