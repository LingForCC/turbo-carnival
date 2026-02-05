import { ipcRenderer } from 'electron';
import type { LLMProvider, ModelConfig } from '../types/provider-management';

/**
 * Preload module - uses ipcRenderer directly
 * For use in preload.ts to expose via contextBridge
 */
export const providerManagement = {
  // ============ PROVIDER METHODS ============

  // Get all providers
  getProviders: () => ipcRenderer.invoke('providers:get'),

  // Add a new provider
  addProvider: (provider: LLMProvider) => ipcRenderer.invoke('providers:add', provider),

  // Update an existing provider
  updateProvider: (id: string, provider: LLMProvider) =>
    ipcRenderer.invoke('providers:update', id, provider),

  // Remove a provider
  removeProvider: (id: string) => ipcRenderer.invoke('providers:remove', id),

  // Get provider by ID
  getProviderById: (id: string) => ipcRenderer.invoke('providers:getById', id),

  // ============ MODEL CONFIG METHODS ============

  // Get all model configs
  getModelConfigs: () => ipcRenderer.invoke('model-configs:get'),

  // Add a new model config
  addModelConfig: (config: ModelConfig) => ipcRenderer.invoke('model-configs:add', config),

  // Update an existing model config
  updateModelConfig: (id: string, config: ModelConfig) =>
    ipcRenderer.invoke('model-configs:update', id, config),

  // Remove a model config
  removeModelConfig: (id: string) => ipcRenderer.invoke('model-configs:remove', id),

  // Get model config by ID
  getModelConfigById: (id: string) => ipcRenderer.invoke('model-configs:getById', id),
};
