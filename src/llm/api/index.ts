import type { LLMProviderSettings, LLMModelSettings, LLMProviderFeatureSettings, LLMModelFeatureSettings } from '../types';
import { getSettingsManagementAPI } from '../../settings/api';

/**
 * Provider Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 *
 * Note: This API now uses the settings management system for storage.
 * The data is stored in feature settings under 'llm-providers' and 'llm-model-configs'.
 */

const settingsAPI = getSettingsManagementAPI();

/**
 * Provider Management API implementation for renderer components
 */
export const providerManagementAPI = {
  // ============ PROVIDER METHODS ============

  /**
   * Get all providers
   */
  getProviders: async (): Promise<LLMProviderSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMProviderFeatureSettings>('llm-providers');
    return settings.providers || [];
  },

  /**
   * Add a new provider
   */
  addProvider: async (provider: LLMProviderSettings): Promise<LLMProviderSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMProviderFeatureSettings>('llm-providers');
    const providers = settings.providers || [];

    // Check for duplicate ID
    if (providers.some(p => p.id === provider.id)) {
      throw new Error(`Provider with ID "${provider.id}" already exists`);
    }

    // Add timestamp
    provider.createdAt = Date.now();
    providers.push(provider);

    await settingsAPI.updateFeatureSettings<LLMProviderFeatureSettings>('llm-providers', { providers });
    return providers;
  },

  /**
   * Update an existing provider
   */
  updateProvider: async (id: string, provider: LLMProviderSettings): Promise<LLMProviderSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMProviderFeatureSettings>('llm-providers');
    const providers = settings.providers || [];
    const index = providers.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    // Preserve createdAt, update updatedAt
    provider.createdAt = providers[index].createdAt;
    provider.updatedAt = Date.now();

    providers[index] = provider;
    await settingsAPI.updateFeatureSettings<LLMProviderFeatureSettings>('llm-providers', { providers });
    return providers;
  },

  /**
   * Remove a provider
   */
  removeProvider: async (id: string): Promise<LLMProviderSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMProviderFeatureSettings>('llm-providers');
    const providers = settings.providers || [];
    const filtered = providers.filter(p => p.id !== id);
    await settingsAPI.updateFeatureSettings<LLMProviderFeatureSettings>('llm-providers', { providers: filtered });
    return filtered;
  },

  /**
   * Get provider by ID
   */
  getProviderById: async (id: string): Promise<LLMProviderSettings> => {
    const settings = await settingsAPI.getFeatureSettings<LLMProviderFeatureSettings>('llm-providers');
    const providers = settings.providers || [];
    const provider = providers.find(p => p.id === id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }
    return provider;
  },

  // ============ MODEL CONFIG METHODS ============

  /**
   * Get all model configs
   */
  getLLMModelSettingss: async (): Promise<LLMModelSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMModelFeatureSettings>('llm-model-configs');
    return settings.modelConfigs || [];
  },

  /**
   * Add a new model config
   */
  addLLMModelSettings: async (config: LLMModelSettings): Promise<LLMModelSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMModelFeatureSettings>('llm-model-configs');
    const modelConfigs = settings.modelConfigs || [];

    // Check for duplicate ID
    if (modelConfigs.some(c => c.id === config.id)) {
      throw new Error(`Model Config with ID "${config.id}" already exists`);
    }

    // Add timestamp
    config.createdAt = Date.now();
    modelConfigs.push(config);

    await settingsAPI.updateFeatureSettings<LLMModelFeatureSettings>('llm-model-configs', { modelConfigs });
    return modelConfigs;
  },

  /**
   * Update an existing model config
   */
  updateLLMModelSettings: async (id: string, config: LLMModelSettings): Promise<LLMModelSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMModelFeatureSettings>('llm-model-configs');
    const modelConfigs = settings.modelConfigs || [];
    const index = modelConfigs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`Model Config with ID "${id}" not found`);
    }

    // Preserve createdAt, update updatedAt
    config.createdAt = modelConfigs[index].createdAt;
    config.updatedAt = Date.now();

    modelConfigs[index] = config;
    await settingsAPI.updateFeatureSettings<LLMModelFeatureSettings>('llm-model-configs', { modelConfigs });
    return modelConfigs;
  },

  /**
   * Remove a model config
   */
  removeLLMModelSettings: async (id: string): Promise<LLMModelSettings[]> => {
    const settings = await settingsAPI.getFeatureSettings<LLMModelFeatureSettings>('llm-model-configs');
    const modelConfigs = settings.modelConfigs || [];
    const filtered = modelConfigs.filter(c => c.id !== id);
    await settingsAPI.updateFeatureSettings<LLMModelFeatureSettings>('llm-model-configs', { modelConfigs: filtered });
    return filtered;
  },

  /**
   * Get model config by ID
   */
  getModelConfigById: async (id: string): Promise<LLMModelSettings> => {
    const settings = await settingsAPI.getFeatureSettings<LLMModelFeatureSettings>('llm-model-configs');
    const modelConfigs = settings.modelConfigs || [];
    const config = modelConfigs.find(c => c.id === id);
    if (!config) {
      throw new Error(`Model Config with ID "${id}" not found`);
    }
    return config;
  },
};

/**
 * Get the ProviderManagementAPI instance
 * Returns a singleton instance
 */
export function getProviderManagementAPI(): typeof providerManagementAPI {
  return providerManagementAPI;
}
