import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { APIKey } from '../global.d.ts';

// ============ API KEY STORAGE HELPERS ============

/**
 * Get the file path for API keys storage
 */
export function getAPIKeysPath(): string {
  return path.join(app.getPath('userData'), 'api-keys.json');
}

/**
 * Load all API keys from storage
 */
export function loadAPIKeys(): APIKey[] {
  const keysPath = getAPIKeysPath();
  if (fs.existsSync(keysPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
      return data.keys || [];
    } catch (error) {
      console.error('Failed to load API keys:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save API keys to storage
 */
export function saveAPIKeys(keys: APIKey[]): void {
  const keysPath = getAPIKeysPath();
  const data = { keys };
  try {
    fs.writeFileSync(keysPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save API keys:', error);
  }
}

/**
 * Get an API key by name
 */
export function getAPIKeyByName(name: string): APIKey | undefined {
  const keys = loadAPIKeys();
  return keys.find(k => k.name === name);
}

// ============ API KEY IPC HANDLERS ============

/**
 * Register all API Key-related IPC handlers
 */
export function registerApiKeyIPCHandlers(): void {
  // Handler: Get all API keys
  ipcMain.handle('api-keys:get', () => {
    return loadAPIKeys();
  });

  // Handler: Add a new API key
  ipcMain.handle('api-keys:add', async (_event, apiKey: APIKey) => {
    const keys = loadAPIKeys();

    // Check for duplicate names
    if (keys.some(k => k.name === apiKey.name)) {
      throw new Error(`API key with name "${apiKey.name}" already exists`);
    }

    keys.push(apiKey);
    saveAPIKeys(keys);
    return keys;
  });

  // Handler: Remove an API key
  ipcMain.handle('api-keys:remove', async (_event, name: string) => {
    const keys = loadAPIKeys();
    const filtered = keys.filter(k => k.name !== name);
    saveAPIKeys(filtered);
    return filtered;
  });
}
