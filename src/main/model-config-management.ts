import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { ModelConfig, LLMProviderType } from '../global.d.ts';

// ============ MODEL CONFIG STORAGE HELPERS ============

/**
 * Get the file path for model configs storage
 */
export function getModelConfigsPath(): string {
  return path.join(app.getPath('userData'), 'model-configs.json');
}

/**
 * Load all model configs from storage
 */
export function loadModelConfigs(): ModelConfig[] {
  const modelConfigsPath = getModelConfigsPath();
  if (fs.existsSync(modelConfigsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(modelConfigsPath, 'utf-8'));
      return data.modelConfigs || [];
    } catch (error) {
      console.error('Failed to load model configs:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save model configs to storage
 */
export function saveModelConfigs(modelConfigs: ModelConfig[]): void {
  const modelConfigsPath = getModelConfigsPath();
  const data = { modelConfigs };
  try {
    fs.writeFileSync(modelConfigsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save model configs:', error);
  }
}

/**
 * Get a model config by ID
 */
export function getModelConfigById(id: string): ModelConfig | undefined {
  const modelConfigs = loadModelConfigs();
  return modelConfigs.find(c => c.id === id);
}

/**
 * Validate model configuration
 */
export function validateModelConfig(modelConfig: ModelConfig): { valid: boolean; error?: string } {
  // Validate ID
  if (!modelConfig.id || !/^[a-zA-Z0-9-_]+$/.test(modelConfig.id)) {
    return { valid: false, error: 'Model Config ID must contain only letters, numbers, hyphens, and underscores' };
  }

  // Validate name
  if (!modelConfig.name || modelConfig.name.trim().length === 0) {
    return { valid: false, error: 'Model Config name is required' };
  }

  // Validate model
  if (!modelConfig.model || modelConfig.model.trim().length === 0) {
    return { valid: false, error: 'Model is required' };
  }

  // Validate type
  if (!modelConfig.type || !['openai', 'glm', 'azure', 'custom'].includes(modelConfig.type)) {
    return { valid: false, error: 'Model Config must have a valid type (openai, glm, azure, custom)' };
  }

  // Validate temperature range
  if (modelConfig.temperature !== undefined) {
    if (typeof modelConfig.temperature !== 'number' || modelConfig.temperature < 0 || modelConfig.temperature > 2) {
      return { valid: false, error: 'Temperature must be between 0 and 2' };
    }
  }

  // Validate maxTokens
  if (modelConfig.maxTokens !== undefined) {
    if (typeof modelConfig.maxTokens !== 'number' || modelConfig.maxTokens < 1) {
      return { valid: false, error: 'Max Tokens must be a positive number' };
    }
  }

  // Validate topP range
  if (modelConfig.topP !== undefined) {
    if (typeof modelConfig.topP !== 'number' || modelConfig.topP < 0 || modelConfig.topP > 1) {
      return { valid: false, error: 'Top P must be between 0 and 1' };
    }
  }

  // Validate extra (if provided, must be an object)
  if (modelConfig.extra !== undefined) {
    if (typeof modelConfig.extra !== 'object' || Array.isArray(modelConfig.extra)) {
      return { valid: false, error: 'Extra properties must be an object' };
    }
  }

  return { valid: true };
}

// ============ MODEL CONFIG IPC HANDLERS ============

/**
 * Register all Model Config-related IPC handlers
 */
export function registerModelConfigIPCHandlers(): void {
  // Handler: Get all model configs
  ipcMain.handle('model-configs:get', () => {
    return loadModelConfigs();
  });

  // Handler: Add a new model config
  ipcMain.handle('model-configs:add', async (_event, modelConfig: ModelConfig) => {
    const modelConfigs = loadModelConfigs();

    // Check for duplicate IDs
    if (modelConfigs.some(c => c.id === modelConfig.id)) {
      throw new Error(`Model Config with ID "${modelConfig.id}" already exists`);
    }

    // Validate model config
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Add timestamp
    modelConfig.createdAt = Date.now();

    modelConfigs.push(modelConfig);
    saveModelConfigs(modelConfigs);
    return modelConfigs;
  });

  // Handler: Update an existing model config
  ipcMain.handle('model-configs:update', async (_event, id: string, modelConfig: ModelConfig) => {
    const modelConfigs = loadModelConfigs();
    const index = modelConfigs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`Model Config with ID "${id}" not found`);
    }

    // Validate model config
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Preserve createdAt, update updatedAt
    modelConfig.createdAt = modelConfigs[index].createdAt;
    modelConfig.updatedAt = Date.now();

    modelConfigs[index] = modelConfig;
    saveModelConfigs(modelConfigs);
    return modelConfigs;
  });

  // Handler: Remove a model config
  ipcMain.handle('model-configs:remove', async (_event, id: string) => {
    const modelConfigs = loadModelConfigs();
    const filtered = modelConfigs.filter(c => c.id !== id);
    saveModelConfigs(filtered);
    return filtered;
  });

  // Handler: Get model config by ID
  ipcMain.handle('model-configs:getById', async (_event, id: string) => {
    const modelConfig = getModelConfigById(id);
    if (!modelConfig) {
      throw new Error(`Model Config with ID "${id}" not found`);
    }
    return modelConfig;
  });
}
