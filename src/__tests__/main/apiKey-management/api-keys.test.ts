// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import {
  getAPIKeysPath,
  loadAPIKeys,
  saveAPIKeys,
  getAPIKeyByName,
} from '../../../main/apiKey-management';
import { createMockAPIKey, createMockAPIKeys } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { APIKey } from '../../../global.d';

describe('API Key Management - Storage Helpers', () => {
  // Mock app.getPath before each test
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('getAPIKeysPath', () => {
    it('should return correct api-keys.json path', () => {

      const apiKeysPath = getAPIKeysPath();
      expect(apiKeysPath).toBe('/mock/userdata/api-keys.json');

    });
  });

  describe('saveAPIKeys and loadAPIKeys', () => {
    it('should save and load API keys successfully', () => {
      const { cleanup } = setupMockFS({});

      const apiKeys: APIKey[] = [
        createMockAPIKey({ name: 'openai-key', apiKey: 'sk-openai-123' }),
        createMockAPIKey({ name: 'anthropic-key', apiKey: 'sk-ant-456' }),
      ];

      // Save API keys
      saveAPIKeys(apiKeys);

      // Load API keys
      const loadedKeys = loadAPIKeys();
      expect(loadedKeys).toHaveLength(2);
      expect(loadedKeys[0].name).toBe('openai-key');
      expect(loadedKeys[0].apiKey).toBe('sk-openai-123');
      expect(loadedKeys[1].name).toBe('anthropic-key');
      expect(loadedKeys[1].apiKey).toBe('sk-ant-456');

      cleanup();
    });

    it('should return empty array when api-keys.json does not exist', () => {
      const { cleanup } = setupMockFS({});

      const apiKeys = loadAPIKeys();
      expect(apiKeys).toEqual([]);

      cleanup();
    });

    it('should handle corrupted JSON gracefully', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': 'invalid json{{{',
      };
      const { cleanup } = setupMockFS(mockFiles);

      const apiKeys = loadAPIKeys();
      expect(apiKeys).toEqual([]);

      cleanup();
    });

    it('should handle missing keys property', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': JSON.stringify({ wrongKey: [] }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const apiKeys = loadAPIKeys();
      expect(apiKeys).toEqual([]);

      cleanup();
    });

    it('should preserve API key metadata', () => {
      const { cleanup } = setupMockFS({});

      const timestamp = Date.now();
      const apiKeys: APIKey[] = [
        createMockAPIKey({
          name: 'test-key',
          apiKey: 'sk-test-123',
          createdAt: timestamp,
          baseURL: 'https://api.example.com',
        }),
      ];

      saveAPIKeys(apiKeys);
      const loadedKeys = loadAPIKeys();

      expect(loadedKeys[0].name).toBe('test-key');
      expect(loadedKeys[0].apiKey).toBe('sk-test-123');
      expect(loadedKeys[0].createdAt).toBe(timestamp);
      expect(loadedKeys[0].baseURL).toBe('https://api.example.com');

      cleanup();
    });

    it('should overwrite existing keys when saving', () => {
      const { cleanup } = setupMockFS({});

      // Save initial keys
      const initialKeys = createMockAPIKeys(3);
      saveAPIKeys(initialKeys);

      // Save new keys (should overwrite)
      const newKeys = createMockAPIKeys(2);
      saveAPIKeys(newKeys);

      const loadedKeys = loadAPIKeys();
      expect(loadedKeys).toHaveLength(2);
      expect(loadedKeys[0].name).toBe('test-api-key-1');
      expect(loadedKeys[1].name).toBe('test-api-key-2');

      cleanup();
    });
  });

  describe('getAPIKeyByName', () => {
    it('should find API key by name', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': JSON.stringify({
          keys: [
            createMockAPIKey({ name: 'openai', apiKey: 'sk-openai' }),
            createMockAPIKey({ name: 'anthropic', apiKey: 'sk-ant' }),
          ],
        }, null, 2),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const apiKey = getAPIKeyByName('openai');
      expect(apiKey).toBeDefined();
      expect(apiKey?.name).toBe('openai');
      expect(apiKey?.apiKey).toBe('sk-openai');

      cleanup();
    });

    it('should return undefined for non-existent key name', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': JSON.stringify({
          keys: [
            createMockAPIKey({ name: 'openai', apiKey: 'sk-openai' }),
          ],
        }, null, 2),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const apiKey = getAPIKeyByName('non-existent');
      expect(apiKey).toBeUndefined();

      cleanup();
    });

    it('should return undefined when no keys exist', () => {
      const { cleanup } = setupMockFS({});

      const apiKey = getAPIKeyByName('any-key');
      expect(apiKey).toBeUndefined();

      cleanup();
    });

    it('should handle empty keys array', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': JSON.stringify({ keys: [] }, null, 2),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const apiKey = getAPIKeyByName('any-key');
      expect(apiKey).toBeUndefined();

      cleanup();
    });

    it('should find exact name match (case-sensitive)', () => {
      const mockFiles: Record<string, string> = {
        '/mock/userdata/api-keys.json': JSON.stringify({
          keys: [
            createMockAPIKey({ name: 'OpenAI', apiKey: 'sk-1' }),
            createMockAPIKey({ name: 'openai', apiKey: 'sk-2' }),
          ],
        }, null, 2),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const key1 = getAPIKeyByName('OpenAI');
      const key2 = getAPIKeyByName('openai');

      expect(key1?.apiKey).toBe('sk-1');
      expect(key2?.apiKey).toBe('sk-2');

      cleanup();
    });
  });
});
