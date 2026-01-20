// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import { ipcMain } from 'electron';
import { registerAppIPCHandlers } from '../../../main/app-management';
import { createMockApp } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';

// Mock ipcMain handle if not already mocked
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

describe('App Management - IPC Handlers', () => {
  let mockHandlers: Map<string, Function>;

  // Helper to safely get handler
  function getHandler(channel: string): Function {
    const handler = mockHandlers.get(channel);
    if (!handler) {
      throw new Error(`Handler '${channel}' not registered`);
    }
    return handler;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers = new Map();

    // Mock ipcMain.handle to capture handlers
    (ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    // Register handlers
    registerAppIPCHandlers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('apps:get', () => {
    it('should get app for agent', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
      });

      // Manually save the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:get');
      const result = await handler(null, '/project', 'test-agent');

      expect(result).not.toBeNull();
      expect(result.name).toBe('test-app');
      expect(result.agentName).toBe('test-agent');

      cleanup();
    });

    it('should return null when app does not exist', async () => {
      const { cleanup } = setupMockFS({});

      const handler = getHandler('apps:get');
      const result = await handler(null, '/project', 'nonexistent');

      expect(result).toBeNull();

      cleanup();
    });
  });

  describe('apps:save', () => {
    it('should save app', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        html: '<div>Saved</div>',
      });

      const handler = getHandler('apps:save');
      await handler(null, '/project', app);

      // Verify file was created
      const fs = require('fs');
      const content = fs.readFileSync('/project/app-test-agent.json', 'utf-8');
      const savedApp = JSON.parse(content);

      expect(savedApp.name).toBe('test-app');
      expect(savedApp.html).toBe('<div>Saved</div>');

      cleanup();
    });

    it('should update timestamp on save', async () => {
      const { cleanup } = setupMockFS({});

      const beforeSave = Date.now();
      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        createdAt: beforeSave,
        updatedAt: beforeSave,
      });

      const handler = getHandler('apps:save');
      await handler(null, '/project', app);

      expect(app.updatedAt).toBeGreaterThanOrEqual(beforeSave);

      cleanup();
    });

    it('should throw error when name or agentName is missing', async () => {
      const { cleanup } = setupMockFS({});

      const invalidApp1 = createMockApp({ name: '', agentName: 'test' });
      const invalidApp2 = createMockApp({ name: 'test', agentName: '' });

      const handler = getHandler('apps:save');

      await expect(handler(null, '/project', invalidApp1)).rejects.toThrow();
      await expect(handler(null, '/project', invalidApp2)).rejects.toThrow();

      cleanup();
    });
  });

  describe('apps:delete', () => {
    it('should delete app', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({ agentName: 'test-agent' });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      // Verify file exists
      expect(fs.existsSync('/project/app-test-agent.json')).toBe(true);

      // Delete via IPC
      const handler = getHandler('apps:delete');
      await handler(null, '/project', 'test-agent');

      // Verify file is gone
      expect(fs.existsSync('/project/app-test-agent.json')).toBe(false);

      cleanup();
    });

    it('should not throw when deleting non-existent app', async () => {
      const { cleanup } = setupMockFS({});

      const handler = getHandler('apps:delete');

      await expect(handler(null, '/project', 'nonexistent')).resolves.toBeUndefined();

      cleanup();
    });
  });

  describe('apps:executeMain', () => {
    it('should execute function from mainCode', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        mainCode: `
          function testFunction(arg1, arg2) {
            return arg1 + arg2;
          }
        `,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:executeMain');
      const result = await handler(null, '/project', 'test-agent', 'testFunction', [5, 3]);

      expect(result).toBe(8);

      cleanup();
    });

    it('should throw error when app does not exist', async () => {
      const { cleanup } = setupMockFS({});

      const handler = getHandler('apps:executeMain');

      await expect(
        handler(null, '/project', 'nonexistent', 'testFunction', [])
      ).rejects.toThrow('App not found');

      cleanup();
    });

    it('should throw error when function not found', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        mainCode: `
          function otherFunction() {
            return 42;
          }
        `,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:executeMain');

      await expect(
        handler(null, '/project', 'test-agent', 'nonExistentFunction', [])
      ).rejects.toThrow();

      cleanup();
    });

    it('should handle async functions', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        mainCode: `
          async function asyncFunction() {
            return await Promise.resolve(42);
          }
        `,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:executeMain');
      const result = await handler(null, '/project', 'test-agent', 'asyncFunction', []);

      expect(result).toBe(42);

      cleanup();
    });

    it('should pass arguments correctly', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        mainCode: `
          function multiArg(a, b, c, d) {
            return { a, b, c, d };
          }
        `,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:executeMain');
      const result = await handler(null, '/project', 'test-agent', 'multiArg', [1, 'two', { three: 3 }, [4]]);

      expect(result).toEqual({
        a: 1,
        b: 'two',
        c: { three: 3 },
        d: [4],
      });

      cleanup();
    });

    it('should handle execution errors', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        mainCode: `
          function errorFunction() {
            throw new Error('Test error');
          }
        `,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:executeMain');

      await expect(
        handler(null, '/project', 'test-agent', 'errorFunction', [])
      ).rejects.toThrow();

      cleanup();
    });
  });

  describe('apps:updateData', () => {
    it('should update app data', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        data: { initial: 'value' },
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:updateData');
      await handler(null, '/project', 'test-agent', { counter: 42, newKey: 'newValue' });

      // Verify data was updated
      const content = fs.readFileSync('/project/app-test-agent.json', 'utf-8');
      const updatedApp = JSON.parse(content);

      expect(updatedApp.data.initial).toBe('value');
      expect(updatedApp.data.counter).toBe(42);
      expect(updatedApp.data.newKey).toBe('newValue');

      cleanup();
    });

    it('should merge data with existing data', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        data: { key1: 'value1', key2: 'value2' },
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:updateData');
      await handler(null, '/project', 'test-agent', { key2: 'newValue', key3: 'value3' });

      // Verify data was merged
      const content = fs.readFileSync('/project/app-test-agent.json', 'utf-8');
      const updatedApp = JSON.parse(content);

      expect(updatedApp.data.key1).toBe('value1');
      expect(updatedApp.data.key2).toBe('newValue');
      expect(updatedApp.data.key3).toBe('value3');

      cleanup();
    });

    it('should throw error when app does not exist', async () => {
      const { cleanup } = setupMockFS({});

      const handler = getHandler('apps:updateData');

      await expect(
        handler(null, '/project', 'nonexistent', { key: 'value' })
      ).rejects.toThrow('App not found');

      cleanup();
    });

    it('should update timestamp on data update', async () => {
      const { cleanup } = setupMockFS({});

      const beforeUpdate = Date.now();
      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        data: {},
        createdAt: beforeUpdate,
        updatedAt: beforeUpdate,
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const handler = getHandler('apps:updateData');
      await handler(null, '/project', 'test-agent', { key: 'value' });

      // Verify timestamp was updated
      const content = fs.readFileSync('/project/app-test-agent.json', 'utf-8');
      const updatedApp = JSON.parse(content);

      expect(updatedApp.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);

      cleanup();
    });

    it('should handle complex data objects', async () => {
      const { cleanup } = setupMockFS({});

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        data: {},
      });

      // Create the app file
      const fs = require('fs');
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      const complexData = {
        nested: { object: { with: 'deep values' } },
        array: [1, 2, 3],
      };

      const handler = getHandler('apps:updateData');
      await handler(null, '/project', 'test-agent', complexData);

      // Verify complex data was saved
      const content = fs.readFileSync('/project/app-test-agent.json', 'utf-8');
      const updatedApp = JSON.parse(content);

      expect(updatedApp.data).toEqual(complexData);

      cleanup();
    });
  });

  describe('IPC Handler Registration', () => {
    it('should register all expected handlers', () => {
      const expectedChannels = [
        'apps:get',
        'apps:save',
        'apps:delete',
        'apps:executeMain',
        'apps:updateData',
      ];

      expectedChannels.forEach(channel => {
        expect(mockHandlers.has(channel)).toBe(true);
      });
    });
  });
});
