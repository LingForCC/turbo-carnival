// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import * as path from 'path';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { FileTreeNode } from '../../../project/types';

// Import and use the injectable getter
import { registerProjectIPCHandlers, setRootFolderGetter } from '../../../project/main/project-management';

describe('Project Management - IPC Handlers', () => {
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock root folder getter
    setRootFolderGetter(() => '/root-folder');

    // Set up mock handler storage
    mockHandlers = new Map();

    // Mock ipcMain.handle to capture registered handlers
    (electron.ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    // Register all IPC handlers
    registerProjectIPCHandlers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('projects:getFileTree', () => {
    it('should return file tree from root folder', async () => {
      const { cleanup } = setupMockFS({
        '/root-folder/folder1/.gitkeep': '',
        '/root-folder/folder1/file.txt': 'content',
        '/root-folder/folder2/.gitkeep': '',
      });

      const handler = mockHandlers.get('projects:getFileTree')!;
      const fileTree = await handler();

      expect(Array.isArray(fileTree)).toBe(true);
      expect(fileTree.length).toBeGreaterThan(0);

      cleanup();
    });

    it('should return empty array when no root folder', async () => {
      // Override getter to return null
      setRootFolderGetter(() => null);

      const handler = mockHandlers.get('projects:getFileTree')!;
      const fileTree = await handler();

      expect(fileTree).toEqual([]);

      // Restore
      setRootFolderGetter(() => '/root-folder');
    });

    it('should exclude hidden files by default', async () => {
      const { cleanup } = setupMockFS({
        '/root-folder/folder1/.gitkeep': '',
        '/root-folder/folder1/file.txt': 'content',
        '/root-folder/.hidden/file.txt': 'hidden content',
      });

      const handler = mockHandlers.get('projects:getFileTree')!;
      const fileTree = await handler();

      // Should have folder1 but not .hidden at root level
      const folderNames = fileTree.map((n: FileTreeNode) => n.name);
      expect(folderNames).toContain('folder1');
      expect(folderNames).not.toContain('.hidden');

      cleanup();
    });

    it('should include hidden files when excludeHidden is false', async () => {
      const { cleanup } = setupMockFS({
        '/root-folder/folder1/file.txt': 'content',
        '/root-folder/.hidden/file.txt': 'hidden content',
      });

      const handler = mockHandlers.get('projects:getFileTree')!;
      const fileTree = await handler({ excludeHidden: false, maxDepth: 2 });

      // Should have both folder1 and .hidden
      const folderNames = fileTree.map((n: FileTreeNode) => n.name);
      expect(folderNames).toContain('folder1');
      expect(folderNames).toContain('.hidden');

      cleanup();
    });
  });

  describe('projects:refreshFileTree', () => {
    it('should refresh file tree from root folder', async () => {
      const { cleanup } = setupMockFS({
        '/root-folder/folder1/.gitkeep': '',
      });

      const handler = mockHandlers.get('projects:refreshFileTree')!;
      const fileTree = await handler();

      expect(Array.isArray(fileTree)).toBe(true);
      expect(fileTree.length).toBeGreaterThan(0);

      cleanup();
    });
  });

  describe('project:getFileTree', () => {
    it('should call buildFileTree with correct default options', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
        '/test-project/src/code.ts': 'code',
      });

      const handler = mockHandlers.get('project:getFileTree')!;
      const result = await handler(null, '/test-project');

      // Should exclude hidden files by default
      expect(result).toHaveLength(2);

      cleanup();
    });

    it('should pass through custom options', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/.env': 'hidden',
        '/test-project/file.txt': 'content',
        '/test-project/file.md': 'markdown',
      });

      const handler = mockHandlers.get('project:getFileTree')!;

      // Test includeExtensions
      const result1 = await handler(null, '/test-project', {
        includeExtensions: ['.txt']
      });
      expect(result1).toHaveLength(1);
      expect(result1[0].name).toBe('file.txt');

      // Test excludeHidden: false
      const result2 = await handler(null, '/test-project', {
        excludeHidden: false
      });
      expect(result2).toHaveLength(3);

      // Test maxDepth (with maxDepth=1, we can go 1 level deep from root)
      const result3 = await handler(null, '/test-project', {
        maxDepth: 1
      });
      // Should get 2 non-hidden files at root level (.env is filtered by default)
      expect(result3).toHaveLength(2);

      cleanup();
    });

    it('should return file tree structure', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/README.md': 'readme',
        '/test-project/src/index.ts': 'index',
      });

      const handler = mockHandlers.get('project:getFileTree')!;
      const result = await handler(null, '/test-project');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure
      const srcDir = result.find((n: any) => n.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir.type).toBe('directory');

      cleanup();
    });

    it('should throw errors from buildFileTree', async () => {
      const handler = mockHandlers.get('project:getFileTree')!;

      // Should not throw for non-existent directory - returns empty array
      const result = await handler(null, '/non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('files:list', () => {
    it('should call listFilesRecursive with default options', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
        '/test-project/file.md': 'markdown',
        '/test-project/file.ts': 'code',
      });

      const handler = mockHandlers.get('files:list')!;
      const result = await handler(null, '/test-project');

      // Default: only .txt and .md files
      expect(result).toHaveLength(2);
      const names = result.map((f: any) => f.name);
      expect(names).toContain('file.txt');
      expect(names).toContain('file.md');
      expect(names).not.toContain('file.ts');

      cleanup();
    });

    it('should pass through custom options', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
        '/test-project/file.ts': 'code',
        '/test-project/src/nested.ts': 'nested',
      });

      const handler = mockHandlers.get('files:list')!;

      // Test custom extensions
      const result1 = await handler(null, '/test-project', {
        extensions: ['.ts']
      });
      expect(result1).toHaveLength(2);

      // Test custom maxDepth
      // With maxDepth=1, we don't recurse into subdirectories
      // But the default extensions filter still applies (.txt, .md only)
      const result2 = await handler(null, '/test-project', {
        maxDepth: 1
      });
      // Should get only file.txt (file.ts doesn't match default extensions)
      expect(result2).toHaveLength(1);

      // Test excludeHidden
      const result3 = await handler(null, '/test-project', {
        excludeHidden: false
      });
      expect(result3.length).toBeGreaterThan(0);

      cleanup();
    });

    it('should return file list', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
      });

      const handler = mockHandlers.get('files:list')!;
      const result = await handler(null, '/test-project');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('extension');

      cleanup();
    });
  });

  describe('files:readContents', () => {
    it('should read multiple files successfully', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file1.txt': 'content1',
        '/test-project/file2.txt': 'content2',
      });

      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, [
        '/test-project/file1.txt',
        '/test-project/file2.txt',
      ]);

      expect(results).toHaveLength(2);

      expect(results[0]).toMatchObject({
        path: '/test-project/file1.txt',
        name: 'file1.txt',
        content: 'content1',
        size: 8,
      });
      expect(results[0].error).toBeUndefined();

      expect(results[1]).toMatchObject({
        path: '/test-project/file2.txt',
        name: 'file2.txt',
        content: 'content2',
        size: 8,
      });
      expect(results[1].error).toBeUndefined();

      cleanup();
    });

    it('should return proper structure (path, name, content, size)', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'hello world',
      });

      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, ['/test-project/file.txt']);

      expect(results[0]).toMatchObject({
        path: '/test-project/file.txt',
        name: 'file.txt',
        content: 'hello world',
        size: 11,
      });

      cleanup();
    });

    it('should handle missing files (includes error in result)', async () => {
      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, ['/non-existent/file.txt']);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        path: '/non-existent/file.txt',
        name: 'file.txt',
        content: '',
        size: 0,
        error: 'File not found',
      });

      // Should not throw error, just include it in result
      expect(results[0].error).toBeDefined();
    });

    it('should handle non-file paths (includes error in result)', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
      });

      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, ['/test-project']); // Directory path

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        path: '/test-project',
        name: 'test-project',
        content: '',
        size: 0,
        error: 'Path is not a file',
      });

      cleanup();
    });

    it('should return results for all files even if some fail', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/file1.txt': 'content1',
        '/test-project/file2.txt': 'content2',
      });

      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, [
        '/test-project/file1.txt', // exists
        '/non-existent/file.txt',  // missing
        '/test-project/file2.txt', // exists
      ]);

      expect(results).toHaveLength(3);

      // First file should succeed
      expect(results[0].error).toBeUndefined();
      expect(results[0].content).toBe('content1');

      // Second file should have error
      expect(results[1].error).toBe('File not found');

      // Third file should succeed
      expect(results[2].error).toBeUndefined();
      expect(results[2].content).toBe('content2');

      cleanup();
    });

    it('should handle empty file list', async () => {
      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, []);

      expect(results).toEqual([]);
    });

    it('should handle directories (non-file paths)', async () => {
      const { cleanup } = setupMockFS({
        '/test-project/src/index.ts': 'code',
      });

      const handler = mockHandlers.get('files:readContents')!;
      const results = await handler(null, ['/test-project/src']); // Directory

      expect(results).toHaveLength(1);
      expect(results[0].error).toBe('Path is not a file');

      cleanup();
    });
  });
});
