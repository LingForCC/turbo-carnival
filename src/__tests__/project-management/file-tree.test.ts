import { isHidden, buildFileTree } from '../../main/project-management';
import { setupMockFS, clearMockFiles } from '../helpers/file-system';

describe('File Tree Helpers', () => {
  describe('isHidden()', () => {
    it('should return true for files starting with dot', () => {
      expect(isHidden('.hidden-file')).toBe(true);
      expect(isHidden('.git')).toBe(true);
      expect(isHidden('.env')).toBe(true);
      expect(isHidden('.gitignore')).toBe(true);
    });

    it('should return false for files not starting with dot', () => {
      expect(isHidden('visible-file.txt')).toBe(false);
      expect(isHidden('normal-folder')).toBe(false);
      expect(isHidden('file-with.dots.txt')).toBe(false);
      expect(isHidden('README.md')).toBe(false);
      expect(isHidden('package.json')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isHidden('')).toBe(false);
    });

    it('should return true for just a dot', () => {
      expect(isHidden('.')).toBe(true);
    });

    it('should return false for dot in middle of name', () => {
      expect(isHidden('file.name.txt')).toBe(false);
      expect(isHidden('src/index.ts')).toBe(false);
    });
  });

  describe('buildFileTree()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.restoreAllMocks();
      clearMockFiles();
    });

    it('should build tree with mixed files and directories', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file1.txt': 'content1',
        '/test-project/file2.md': 'content2',
        '/test-project/src/index.ts': 'code',
        '/test-project/src/utils.ts': 'utils',
      });

      const result = buildFileTree('/test-project');

      expect(result).toHaveLength(3); // 2 files + 1 directory (src)

      // Check directory exists
      const srcDir = result.find(n => n.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir?.type).toBe('directory');
      expect(srcDir?.children).toHaveLength(2); // index.ts, utils.ts

      // Check files exist
      const file1 = result.find(n => n.name === 'file1.txt');
      expect(file1).toBeDefined();
      expect(file1?.type).toBe('file');

      const file2 = result.find(n => n.name === 'file2.md');
      expect(file2).toBeDefined();
      expect(file2?.type).toBe('file');

      cleanup();
    });

    it('should sort directories before files, both alphabetically', () => {
      const { cleanup } = setupMockFS({
        '/test-project/zebra.txt': 'content',
        '/test-project/apple.txt': 'content',
        '/test-project/folder-z/file.ts': 'code',
        '/test-project/folder-a/file.ts': 'code',
      });

      const result = buildFileTree('/test-project');

      // Order should be: folder-a, folder-z, apple.txt, zebra.txt
      expect(result[0].name).toBe('folder-a');
      expect(result[1].name).toBe('folder-z');
      expect(result[2].name).toBe('apple.txt');
      expect(result[3].name).toBe('zebra.txt');

      cleanup();
    });

    it('should expand directories recursively by default', () => {
      const { cleanup } = setupMockFS({
        '/test-project/a/b/c/deep.txt': 'content',
      });

      const result = buildFileTree('/test-project');

      expect(result).toHaveLength(1);
      const dirA = result[0];
      expect(dirA.name).toBe('a');
      expect(dirA.children).toHaveLength(1);

      const dirB = dirA.children[0];
      expect(dirB.name).toBe('b');
      expect(dirB.children).toHaveLength(1);

      const dirC = dirB.children[0];
      expect(dirC.name).toBe('c');
      expect(dirC.children).toHaveLength(1);

      const deepFile = dirC.children[0];
      expect(deepFile.name).toBe('deep.txt');
      expect(deepFile.type).toBe('file');

      cleanup();
    });

    it('should filter hidden files when excludeHidden is true (default)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/.env': 'hidden',
        '/test-project/.git/config': 'config',
        '/test-project/visible.txt': 'visible',
        '/test-project/.hidden-dir/file.txt': 'content',
      });

      const result = buildFileTree('/test-project', { excludeHidden: true });

      // Should not include .env, .git, or .hidden-dir
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible.txt');

      cleanup();
    });

    it('should include hidden files when excludeHidden is false', () => {
      const { cleanup } = setupMockFS({
        '/test-project/.env': 'hidden',
        '/test-project/visible.txt': 'visible',
      });

      const result = buildFileTree('/test-project', { excludeHidden: false });

      expect(result).toHaveLength(2);
      const envFile = result.find(n => n.name === '.env');
      expect(envFile).toBeDefined();

      const visibleFile = result.find(n => n.name === 'visible.txt');
      expect(visibleFile).toBeDefined();

      cleanup();
    });

    it('should filter files by extension when includeExtensions is specified', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'text',
        '/test-project/file.md': 'markdown',
        '/test-project/file.ts': 'typescript',
        '/test-project/file.js': 'javascript',
      });

      const result = buildFileTree('/test-project', {
        includeExtensions: ['.txt', '.md']
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file.md');
      expect(result[1].name).toBe('file.txt');

      cleanup();
    });

    it('should respect maxDepth option', () => {
      const { cleanup } = setupMockFS({
        '/test-project/a/b/c/d/e.txt': 'deep',
      });

      const result = buildFileTree('/test-project', { maxDepth: 2 });

      expect(result).toHaveLength(1);
      const dirA = result[0];
      expect(dirA.name).toBe('a');
      expect(dirA.children).toHaveLength(1);

      const dirB = dirA.children[0];
      expect(dirB.name).toBe('b');
      // Should not go deeper than maxDepth=2
      expect(dirB.children).toHaveLength(0);

      cleanup();
    });

    it('should return empty array for non-existent directory (warning logged)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = buildFileTree('/non-existent-path');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Directory does not exist')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return empty array for non-directory path (warning logged)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
      });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = buildFileTree('/test-project/file.txt');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path is not a directory')
      );

      consoleWarnSpy.mockRestore();
      cleanup();
    });

    it('should set proper node structure for directories', () => {
      const { cleanup } = setupMockFS({
        '/test-project/dir/file.txt': 'content',
      });

      const result = buildFileTree('/test-project');

      const dir = result[0];
      expect(dir).toMatchObject({
        name: 'dir',
        path: '/test-project/dir',
        type: 'directory',
        expanded: false,
      });
      expect(dir.children).toBeDefined();
      expect(Array.isArray(dir.children)).toBe(true);

      cleanup();
    });

    it('should set proper node structure for files', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'content',
      });

      const result = buildFileTree('/test-project');

      const file = result[0];
      expect(file).toMatchObject({
        name: 'file.txt',
        path: '/test-project/file.txt',
        type: 'file',
      });
      expect(file.children).toBeUndefined();

      cleanup();
    });

    it('should handle empty directory', () => {
      const { cleanup } = setupMockFS({
        // No files in directory - the mock treats paths with 'project' as existing directories
      });

      const result = buildFileTree('/test-project');

      expect(result).toEqual([]);

      cleanup();
    });
  });
});
