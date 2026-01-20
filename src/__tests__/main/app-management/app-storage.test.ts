// Mocks are set up in jest.setup.ts
import {
  sanitizeAppName,
  getAppFilePath,
  loadApp,
  saveApp,
  deleteAppFile,
  createApp,
} from '../../../main/app-management';
import { createMockApp } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { App } from '../../../global.d';

describe('App Management - Storage Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('sanitizeAppName', () => {
    it('should sanitize app names correctly', () => {
      expect(sanitizeAppName('My App')).toBe('my-app');
      expect(sanitizeAppName('App@#$%')).toBe('app');
      expect(sanitizeAppName('  Test  App  ')).toBe('test-app');
      expect(sanitizeAppName('My-App_Name')).toBe('my-app_name');
      expect(sanitizeAppName('App123')).toBe('app123');
    });

    it('should handle empty string', () => {
      expect(sanitizeAppName('')).toBe('');
    });

    it('should handle special characters only', () => {
      expect(sanitizeAppName('@#$%')).toBe('');
    });
  });

  describe('getAppFilePath', () => {
    it('should return correct app file path', () => {
      const path = getAppFilePath('/project', 'My Agent');
      expect(path).toBe('/project/app-my-agent.json');
    });

    it('should sanitize agent name in path', () => {
      const path = getAppFilePath('/project', 'My@Agent#Name');
      expect(path).toBe('/project/app-myagentname.json');
    });
  });

  describe('createApp', () => {
    it('should create empty app with correct structure', () => {
      const app = createApp('test-agent');

      expect(app.name).toBe('test-agent');
      expect(app.agentName).toBe('test-agent');
      expect(app.html).toContain('App HTML will be generated');
      expect(app.rendererCode).toContain('App initialized');
      expect(app.mainCode).toContain('// Main process');
      expect(app.data).toEqual({});
      expect(app.createdAt).toBeDefined();
      expect(app.updatedAt).toBeDefined();
    });

    it('should set createdAt and updatedAt to same timestamp initially', () => {
      const beforeCreate = Date.now();
      const app = createApp('test-agent');
      const afterCreate = Date.now();

      expect(app.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(app.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(app.updatedAt).toBe(app.createdAt);
    });
  });

  describe('saveApp and loadApp', () => {
    it('should save and load app successfully', () => {
      const { cleanup } = setupMockFS({});

      const app: App = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        html: '<div>Test Content</div>',
        rendererCode: 'console.log("test");',
        mainCode: 'function test() { return true; }',
        data: { counter: 42 },
      });

      saveApp('/project', app);
      const loadedApp = loadApp('/project', 'test-agent');

      expect(loadedApp).not.toBeNull();
      expect(loadedApp?.name).toBe('test-app');
      expect(loadedApp?.agentName).toBe('test-agent');
      expect(loadedApp?.html).toBe('<div>Test Content</div>');
      expect(loadedApp?.rendererCode).toBe('console.log("test");');
      expect(loadedApp?.mainCode).toBe('function test() { return true; }');
      expect(loadedApp?.data.counter).toBe(42);

      cleanup();
    });

    it('should return null when app does not exist', () => {
      const { cleanup } = setupMockFS({});

      const app = loadApp('/project', 'nonexistent');
      expect(app).toBeNull();

      cleanup();
    });

    it('should update timestamp on save', () => {
      const { cleanup } = setupMockFS({});

      const app = createApp('test-agent');
      const originalTimestamp = app.updatedAt;

      // Wait a bit to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 10) { /* busy wait */ }

      saveApp('/project', app);
      expect(app.updatedAt).toBeGreaterThan(originalTimestamp);

      cleanup();
    });

    it('should handle corrupted JSON gracefully', () => {
      const mockFiles: Record<string, string> = {
        '/project/app-test-agent.json': 'invalid json{{{',
      };
      const { cleanup } = setupMockFS(mockFiles);

      const app = loadApp('/project', 'test-agent');
      expect(app).toBeNull();

      cleanup();
    });

    it('should return null for invalid app structure', () => {
      const mockFiles: Record<string, string> = {
        '/project/app-test-agent.json': JSON.stringify({
          // Missing required fields
          wrongField: 'value',
        }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const app = loadApp('/project', 'test-agent');
      expect(app).toBeNull();

      cleanup();
    });

    it('should preserve all app fields on save/load', () => {
      const { cleanup } = setupMockFS({});

      const timestamp = Date.now();
      const app: App = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        html: '<div>HTML</div>',
        rendererCode: '// renderer',
        mainCode: '// main',
        data: { key1: 'value1', key2: 42 },
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      saveApp('/project', app);
      const loadedApp = loadApp('/project', 'test-agent');

      expect(loadedApp?.name).toBe('test-app');
      expect(loadedApp?.agentName).toBe('test-agent');
      expect(loadedApp?.html).toBe('<div>HTML</div>');
      expect(loadedApp?.rendererCode).toBe('// renderer');
      expect(loadedApp?.mainCode).toBe('// main');
      expect(loadedApp?.data).toEqual({ key1: 'value1', key2: 42 });
      expect(loadedApp?.createdAt).toBe(timestamp);
      expect(loadedApp?.updatedAt).toBe(timestamp);

      cleanup();
    });

    it('should overwrite existing app when saving', () => {
      const { cleanup } = setupMockFS({});

      // Save initial app
      const initialApp = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        html: '<div>Initial</div>',
      });
      saveApp('/project', initialApp);

      // Save new app (should overwrite)
      const newApp = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        html: '<div>New</div>',
        data: { updated: true },
      });
      saveApp('/project', newApp);

      const loadedApp = loadApp('/project', 'test-agent');
      expect(loadedApp?.html).toBe('<div>New</div>');
      expect(loadedApp?.data).toEqual({ updated: true });

      cleanup();
    });
  });

  describe('deleteAppFile', () => {
    it('should delete app file', () => {
      const mockFiles: Record<string, string> = {
        '/project/app-test-agent.json': JSON.stringify(createMockApp()),
      };
      const { cleanup } = setupMockFS(mockFiles);

      // Verify app exists
      let app = loadApp('/project', 'test-agent');
      expect(app).not.toBeNull();

      // Delete app
      deleteAppFile('/project', 'test-agent');

      // Verify app is gone
      app = loadApp('/project', 'test-agent');
      expect(app).toBeNull();

      cleanup();
    });

    it('should not throw when deleting non-existent app', () => {
      const { cleanup } = setupMockFS({});

      expect(() => deleteAppFile('/project', 'nonexistent')).not.toThrow();

      cleanup();
    });

    it('should not affect other apps when deleting', () => {
      const mockFiles: Record<string, string> = {
        '/project/app-agent1.json': JSON.stringify(createMockApp({ agentName: 'agent1' })),
        '/project/app-agent2.json': JSON.stringify(createMockApp({ agentName: 'agent2' })),
      };
      const { cleanup } = setupMockFS(mockFiles);

      // Delete agent1
      deleteAppFile('/project', 'agent1');

      // Verify agent1 is gone
      let app = loadApp('/project', 'agent1');
      expect(app).toBeNull();

      // Verify agent2 still exists
      app = loadApp('/project', 'agent2');
      expect(app).not.toBeNull();

      cleanup();
    });
  });

  describe('loadApp edge cases', () => {
    it('should handle empty HTML field', () => {
      const mockFiles: Record<string, string> = {
        '/project/app-test-agent.json': JSON.stringify({
          name: 'test',
          agentName: 'test-agent',
          html: '',
          rendererCode: '// code',
          mainCode: '',
          data: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const app = loadApp('/project', 'test-agent');
      expect(app).not.toBeNull();
      expect(app?.html).toBe('');

      cleanup();
    });

    it('should handle complex data objects', () => {
      const { cleanup } = setupMockFS({});

      const complexData = {
        nested: {
          object: {
            with: { deep: { values: [1, 2, 3] } },
          },
        },
        array: [{ a: 1 }, { b: 2 }],
        primitives: 'string',
      };

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        data: complexData,
      });

      saveApp('/project', app);
      const loadedApp = loadApp('/project', 'test-agent');

      expect(loadedApp?.data).toEqual(complexData);

      cleanup();
    });

    it('should handle multi-line code', () => {
      const { cleanup } = setupMockFS({});

      const multiLineCode = `
        function example() {
          return 'line1\\nline2\\nline3';
        }
      `;

      const app = createMockApp({
        name: 'test-app',
        agentName: 'test-agent',
        rendererCode: multiLineCode,
      });

      saveApp('/project', app);
      const loadedApp = loadApp('/project', 'test-agent');

      expect(loadedApp?.rendererCode).toBe(multiLineCode);

      cleanup();
    });
  });
});
