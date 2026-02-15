import { listFilesRecursive } from '../../../project/main/project-management';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';

describe('File Listing Helpers', () => {
  describe('listFilesRecursive()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.restoreAllMocks();
      clearMockFiles();
    });

    it('should list all files recursively in flat array', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file1.txt': 'content1',
        '/test-project/file2.md': 'content2',
        '/test-project/src/index.ts': 'code',
        '/test-project/src/utils.ts': 'utils',
        '/test-project/tests/test.spec.ts': 'test',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(5);

      // Check structure of each file
      result.forEach(file => {
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('extension');
        expect(file.path).toContain('/test-project');
      });

      // Check specific files exist
      const fileNames = result.map(f => f.name);
      expect(fileNames).toContain('file1.txt');
      expect(fileNames).toContain('file2.md');
      expect(fileNames).toContain('index.ts');
      expect(fileNames).toContain('utils.ts');
      expect(fileNames).toContain('test.spec.ts');

      cleanup();
    });

    it('should filter by extension when extensions option is specified', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'text',
        '/test-project/file.md': 'markdown',
        '/test-project/file.ts': 'typescript',
        '/test-project/file.js': 'javascript',
        '/test-project/src/index.ts': 'code',
      });

      const result = listFilesRecursive('/test-project', {
        extensions: ['.txt', '.md']
      });

      expect(result).toHaveLength(2);
      const fileNames = result.map(f => f.name);
      expect(fileNames).toContain('file.txt');
      expect(fileNames).toContain('file.md');
      expect(fileNames).not.toContain('file.ts');
      expect(fileNames).not.toContain('file.js');
      expect(fileNames).not.toContain('index.ts');

      cleanup();
    });

    it('should default to no extension filter when extensions not provided', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.txt': 'text',
        '/test-project/file.md': 'markdown',
        '/test-project/file.ts': 'code',
        '/test-project/noext': 'no extension',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(4);

      cleanup();
    });

    it('should filter hidden files when excludeHidden is true (default)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/.env': 'hidden',
        '/test-project/.git/config': 'config',
        '/test-project/visible.txt': 'visible',
        '/test-project/.hidden-dir/file.txt': 'content',
      });

      const result = listFilesRecursive('/test-project', { excludeHidden: true });

      // Should not include .env, .git/config, or .hidden-dir/file.txt
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible.txt');

      cleanup();
    });

    it('should include hidden files when excludeHidden is false', () => {
      const { cleanup } = setupMockFS({
        '/test-project/.env': 'hidden',
        '/test-project/visible.txt': 'visible',
        '/test-project/.hidden-dir/file.txt': 'content',
      });

      const result = listFilesRecursive('/test-project', { excludeHidden: false });

      expect(result).toHaveLength(3);
      const fileNames = result.map(f => f.name);
      expect(fileNames).toContain('.env');
      expect(fileNames).toContain('visible.txt');
      expect(fileNames).toContain('file.txt');

      cleanup();
    });

    it('should respect maxDepth option', () => {
      const { cleanup } = setupMockFS({
        '/test-project/a/b/c/d/e.txt': 'deep',
        '/test-project/shallow.txt': 'shallow',
      });

      // maxDepth=2 should only include files up to 2 levels deep
      const result = listFilesRecursive('/test-project', { maxDepth: 2 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('shallow.txt');

      cleanup();
    });

    it('should return empty array for non-existent directory (warning logged)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = listFilesRecursive('/non-existent-path');

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

      const result = listFilesRecursive('/test-project/file.txt');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path is not a directory')
      );

      consoleWarnSpy.mockRestore();
      cleanup();
    });

    it('should return sorted array (alphabetically by name)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/zebra.txt': 'z',
        '/test-project/apple.txt': 'a',
        '/test-project/banana.txt': 'b',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('apple.txt');
      expect(result[1].name).toBe('banana.txt');
      expect(result[2].name).toBe('zebra.txt');

      cleanup();
    });

    it('should include proper metadata (name, path, extension)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/src/components/button.ts': 'code',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'button.ts',
        path: '/test-project/src/components/button.ts',
        extension: '.ts',
      });

      cleanup();
    });

    it('should handle files with no extension', () => {
      const { cleanup } = setupMockFS({
        '/test-project/Makefile': 'content',
        '/test-project/Dockerfile': 'content',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Dockerfile');
      expect(result[0].extension).toBe('');
      expect(result[1].name).toBe('Makefile');
      expect(result[1].extension).toBe('');

      cleanup();
    });

    it('should handle multiple dots in filename (extension is last part)', () => {
      const { cleanup } = setupMockFS({
        '/test-project/file.name.with.dots.txt': 'content',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file.name.with.dots.txt');
      expect(result[0].extension).toBe('.txt');

      cleanup();
    });

    it('should handle nested directories with mixed content', () => {
      const { cleanup } = setupMockFS({
        '/test-project/README.md': 'readme',
        '/test-project/src/index.ts': 'index',
        '/test-project/src/utils/helper.ts': 'helper',
        '/test-project/tests/unit/test.spec.ts': 'test',
        '/test-project/tests/integration/integration.spec.ts': 'integration',
      });

      const result = listFilesRecursive('/test-project');

      expect(result).toHaveLength(5);
      const fileNames = result.map(f => f.name);
      expect(fileNames).toContain('README.md');
      expect(fileNames).toContain('index.ts');
      expect(fileNames).toContain('helper.ts');
      expect(fileNames).toContain('test.spec.ts');
      expect(fileNames).toContain('integration.spec.ts');

      cleanup();
    });
  });
});
