import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { LLMProvider, LLMProviderType } from '../types/provider-management';

// ============ PROVIDER STORAGE HELPERS ============

/**
 * Get the file path for providers storage
 */
export function getProvidersPath(): string {
  return path.join(app.getPath('userData'), 'providers.json');
}

/**
 * Load all providers from storage
 */
export function loadProviders(): LLMProvider[] {
  const providersPath = getProvidersPath();
  if (fs.existsSync(providersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(providersPath, 'utf-8'));
      return data.providers || [];
    } catch (error) {
      console.error('Failed to load providers:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save providers to storage
 */
export function saveProviders(providers: LLMProvider[]): void {
  const providersPath = getProvidersPath();
  const data = { providers };
  try {
    fs.writeFileSync(providersPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save providers:', error);
  }
}

/**
 * Get a provider by ID
 */
export function getProviderById(id: string): LLMProvider | undefined {
  const providers = loadProviders();
  return providers.find(p => p.id === id);
}

/**
 * Validate provider configuration based on type
 */
export function validateProvider(provider: LLMProvider): { valid: boolean; error?: string } {
  // Validate ID
  if (!provider.id || !/^[a-zA-Z0-9-_]+$/.test(provider.id)) {
    return { valid: false, error: 'Provider ID must contain only letters, numbers, hyphens, and underscores' };
  }

  // Validate name
  if (!provider.name || provider.name.trim().length === 0) {
    return { valid: false, error: 'Provider name is required' };
  }

  // Validate API key
  if (!provider.apiKey || provider.apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  // Type-specific validation
  switch (provider.type) {
    case 'glm':
    case 'custom':
      if (!provider.baseURL || provider.baseURL.trim().length === 0) {
        return { valid: false, error: `Base URL is required for ${provider.type} providers` };
      }
      break;
    case 'openai':
      // OpenAI has default URL, so optional
      break;
  }

  return { valid: true };
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

// ============ PROVIDER IPC HANDLERS ============

/**
 * Register all Provider-related IPC handlers
 */
export function registerProviderIPCHandlers(): void {
  // Handler: Get all providers
  ipcMain.handle('providers:get', () => {
    return loadProviders();
  });

  // Handler: Add a new provider
  ipcMain.handle('providers:add', async (_event, provider: LLMProvider) => {
    const providers = loadProviders();

    // Check for duplicate IDs
    if (providers.some(p => p.id === provider.id)) {
      throw new Error(`Provider with ID "${provider.id}" already exists`);
    }

    // Validate provider
    const validation = validateProvider(provider);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Add timestamp
    provider.createdAt = Date.now();

    providers.push(provider);
    saveProviders(providers);
    return providers;
  });

  // Handler: Update an existing provider
  ipcMain.handle('providers:update', async (_event, id: string, provider: LLMProvider) => {
    const providers = loadProviders();
    const index = providers.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error(`Provider with ID "${id}" not found`);
    }

    // Validate provider
    const validation = validateProvider(provider);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Preserve createdAt, update updatedAt
    provider.createdAt = providers[index].createdAt;
    provider.updatedAt = Date.now();

    providers[index] = provider;
    saveProviders(providers);
    return providers;
  });

  // Handler: Remove a provider
  ipcMain.handle('providers:remove', async (_event, id: string) => {
    const providers = loadProviders();
    const filtered = providers.filter(p => p.id !== id);
    saveProviders(filtered);
    return filtered;
  });

  // Handler: Get provider by ID
  ipcMain.handle('providers:getById', async (_event, id: string) => {
    const provider = getProviderById(id);
    if (!provider) {
      throw new Error(`Provider with ID "${id}" not found`);
    }
    return provider;
  });
}
