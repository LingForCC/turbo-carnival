// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import { registerApiKeyIPCHandlers } from '../../main/apiKey-management';
import { setupMockFS, clearMockFiles } from '../helpers/file-system';
import { createMockAPIKey, createMockAPIKeys } from '../helpers/mocks';
import type { APIKey } from '../../global.d';

describe('API Key Management - IPC Handlers', () => {
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock handler storage
    mockHandlers = new Map();

    // Mock ipcMain.handle to capture registered handlers
    (electron.ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    // Register all IPC handlers
    registerApiKeyIPCHandlers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('api-keys:get', () => {
    it('should return all API keys', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));

      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toHaveLength(2);
      expect(keys[0].name).toBe('key1');
      expect(keys[1].name).toBe('key2');

      cleanup();
    });

    it('should return empty array when no keys exist', async () => {
      const { cleanup } = setupMockFS({});

      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toEqual([]);

      cleanup();
    });

    it('should return API keys with all metadata', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      const timestamp = Date.now();
      await addHandler(null, createMockAPIKey({
        name: 'test-key',
        apiKey: 'sk-test-123',
        createdAt: timestamp,
        baseURL: 'https://api.example.com',
      }));

      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatchObject({
        name: 'test-key',
        apiKey: 'sk-test-123',
        createdAt: timestamp,
        baseURL: 'https://api.example.com',
      });

      cleanup();
    });
  });

  describe('api-keys:add', () => {
    it('should add a new API key', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      const newKey = createMockAPIKey({ name: 'openai', apiKey: 'sk-openai-123' });

      const keys = await addHandler(null, newKey);

      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('openai');
      expect(keys[0].apiKey).toBe('sk-openai-123');

      cleanup();
    });

    it('should prevent duplicate API key names', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;

      // Add first key
      const key1 = createMockAPIKey({ name: 'duplicate-key', apiKey: 'sk-first' });
      let keys = await addHandler(null, key1);
      expect(keys).toHaveLength(1);

      // Try to add duplicate
      const key2 = createMockAPIKey({ name: 'duplicate-key', apiKey: 'sk-second' });
      await expect(addHandler(null, key2)).rejects.toThrow(
        'API key with name "duplicate-key" already exists'
      );

      // Verify only first key was added
      const getHandler = mockHandlers.get('api-keys:get')!;
      keys = await getHandler();
      expect(keys).toHaveLength(1);
      expect(keys[0].apiKey).toBe('sk-first');

      cleanup();
    });

    it('should save API key after adding', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'test-key', apiKey: 'sk-test' }));

      // Verify persistence
      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('test-key');

      cleanup();
    });

    it('should return updated keys array after adding', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;

      let keys = await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      expect(keys).toHaveLength(1);

      keys = await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));
      expect(keys).toHaveLength(2);

      keys = await addHandler(null, createMockAPIKey({ name: 'key3', apiKey: 'sk-3' }));
      expect(keys).toHaveLength(3);

      cleanup();
    });

    it('should allow API keys with same value but different names', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      const apiKeyValue = 'sk-same-value';

      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: apiKeyValue }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: apiKeyValue }));

      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toHaveLength(2);
      expect(keys[0].apiKey).toBe(apiKeyValue);
      expect(keys[1].apiKey).toBe(apiKeyValue);

      cleanup();
    });

    it('should preserve all API key properties when adding', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      const timestamp = Date.now();

      const newKey: APIKey = {
        name: 'full-key',
        apiKey: 'sk-complete-123',
        createdAt: timestamp,
        baseURL: 'https://api.openai.com/v1',
      };

      const keys = await addHandler(null, newKey);

      expect(keys).toHaveLength(1);
      expect(keys[0]).toEqual(newKey);

      cleanup();
    });
  });

  describe('api-keys:remove', () => {
    it('should remove API key by name', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));
      await addHandler(null, createMockAPIKey({ name: 'key3', apiKey: 'sk-3' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;
      const keys = await removeHandler(null, 'key2');

      expect(keys).toHaveLength(2);
      expect(keys.some((k: APIKey) => k.name === 'key1')).toBe(true);
      expect(keys.some((k: APIKey) => k.name === 'key2')).toBe(false);
      expect(keys.some((k: APIKey) => k.name === 'key3')).toBe(true);

      cleanup();
    });

    it('should save API keys after removal', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;
      await removeHandler(null, 'key1');

      // Verify persistence
      const getHandler = mockHandlers.get('api-keys:get')!;
      const keys = await getHandler();

      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('key2');

      cleanup();
    });

    it('should return filtered keys array after removal', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;
      const keys = await removeHandler(null, 'key1');

      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('key2');

      cleanup();
    });

    it('should handle removing non-existent key without error', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;
      const keys = await removeHandler(null, 'non-existent');

      // Should still have key1
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('key1');

      cleanup();
    });

    it('should handle removing from empty keys list', async () => {
      const { cleanup } = setupMockFS({});

      const removeHandler = mockHandlers.get('api-keys:remove')!;
      const keys = await removeHandler(null, 'any-key');

      expect(keys).toEqual([]);

      cleanup();
    });

    it('should be able to remove all keys one by one', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'key1', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'key2', apiKey: 'sk-2' }));
      await addHandler(null, createMockAPIKey({ name: 'key3', apiKey: 'sk-3' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;

      let keys = await removeHandler(null, 'key1');
      expect(keys).toHaveLength(2);

      keys = await removeHandler(null, 'key2');
      expect(keys).toHaveLength(1);

      keys = await removeHandler(null, 'key3');
      expect(keys).toHaveLength(0);

      cleanup();
    });

    it('should be case-sensitive when removing by name', async () => {
      const { cleanup } = setupMockFS({});

      const addHandler = mockHandlers.get('api-keys:add')!;
      await addHandler(null, createMockAPIKey({ name: 'OpenAI', apiKey: 'sk-1' }));
      await addHandler(null, createMockAPIKey({ name: 'openai', apiKey: 'sk-2' }));

      const removeHandler = mockHandlers.get('api-keys:remove')!;

      // Remove 'OpenAI' (capital O)
      let keys = await removeHandler(null, 'OpenAI');
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('openai');

      // Now remove 'openai' (lowercase)
      keys = await removeHandler(null, 'openai');
      expect(keys).toHaveLength(0);

      cleanup();
    });
  });
});
