/**
 * LLM Settings Helper for Main Process
 * Provides access to LLM provider and model configuration data from settings
 */

import type { LLMProvider, ModelConfig, LLMProviderFeatureSettings, LLMModelFeatureSettings, LLMProviderType } from '../types';
import { loadSettings } from '../../settings/main/settings-management';
import { getFeatureDefaults } from '../../settings/main/settings-registry';

/**
 * Get all providers from settings
 */
export function getProviders(): LLMProvider[] {
  const settings = loadSettings();
  const defaults = getFeatureDefaults();
  const featureSettings = settings.features?.['llm-providers'] || defaults['llm-providers'] || {};
  return featureSettings.providers || [];
}

/**
 * Get a provider by ID from settings
 */
export function getProviderById(id: string): LLMProvider | undefined {
  const providers = getProviders();
  return providers.find(p => p.id === id);
}

/**
 * Get all model configs from settings
 */
export function getModelConfigs(): ModelConfig[] {
  const settings = loadSettings();
  const defaults = getFeatureDefaults();
  const featureSettings = settings.features?.['llm-model-configs'] || defaults['llm-model-configs'] || {};
  return featureSettings.modelConfigs || [];
}

/**
 * Get a model config by ID from settings
 */
export function getModelConfigById(id: string): ModelConfig | undefined {
  const modelConfigs = getModelConfigs();
  return modelConfigs.find(c => c.id === id);
}

/**
 * Get default base URL for provider type
 */
export function getDefaultBaseURL(type: LLMProviderType): string | undefined {
  switch (type) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'glm':
      return 'https://open.bigmodel.cn/api/paas/v4';
    default:
      return undefined;
  }
}
