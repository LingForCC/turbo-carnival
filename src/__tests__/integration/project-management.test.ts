import { jest } from '@jest/globals';
import { app } from 'electron';
import {
  getProjectsPath,
  loadProjects,
  saveProjects,
  isHidden,
  buildFileTree,
  listFilesRecursive,
} from '../../main/project-management';
import { createMockProject, createTestProjectStructure } from '../helpers/mocks';
import { setupMockFS } from '../helpers/file-system';
import type { Project } from '../../global.d';

describe('Project Management - Integration Tests', () => {
  // Mock app.getPath and reset file system
  beforeEach(() => {
    (app.getPath as jest.Mock).mockReturnValue('/mock/userdata');
    const { cleanup } = setupMockFS({});
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Storage Helpers', () => {
    describe('getProjectsPath', () => {
      it('should return correct projects.json path', () => {
        const projectsPath = getProjectsPath();
        expect(projectsPath).toBe('/mock/userdata/projects.json');
        expect(app.getPath).toHaveBeenCalledWith('userData');
      });
    });

    describe('saveProjects and loadProjects', () => {
      it('should save and load projects successfully', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const projects: Project[] = [
          createMockProject({ path: '/project1', name: 'project1' }),
          createMockProject({ path: '/project2', name: 'project2' }),
        ];

        // Save projects
        saveProjects(projects);

        // Verify file content
        const savedContent = mockFiles['/mock/userdata/projects.json'];
        expect(savedContent).toBeDefined();

        const parsed = JSON.parse(savedContent);
        expect(parsed).toHaveProperty('projects');
        expect(parsed.projects).toHaveLength(2);
        expect(parsed.projects[0]).toMatchObject({
          path: '/project1',
          name: 'project1',
        });
        expect(parsed.projects[1]).toMatchObject({
          path: '/project2',
          name: 'project2',
        });

        // Load projects
        const loadedProjects = loadProjects();
        expect(loadedProjects).toHaveLength(2);
        expect(loadedProjects[0].path).toBe('/project1');
        expect(loadedProjects[1].path).toBe('/project2');

        cleanup();
      });

      it('should return empty array when projects.json does not exist', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const projects = loadProjects();
        expect(projects).toEqual([]);

        cleanup();
      });

      it('should handle corrupted JSON gracefully', () => {
        const mockFiles: Record<string, string> = {
          '/mock/userdata/projects.json': 'invalid json{{{',
        };
        const { cleanup } = setupMockFS(mockFiles);

        const projects = loadProjects();
        expect(projects).toEqual([]);

        cleanup();
      });

      it('should handle missing projects property', () => {
        const mockFiles: Record<string, string> = {
          '/mock/userdata/projects.json': JSON.stringify({ wrongKey: [] }),
        };
        const { cleanup } = setupMockFS(mockFiles);

        const projects = loadProjects();
        expect(projects).toEqual([]);

        cleanup();
      });

      it('should preserve project metadata', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const timestamp = Date.now();
        const projects: Project[] = [
          createMockProject({
            path: '/test-project',
            name: 'test-project',
            addedAt: timestamp,
          }),
        ];

        saveProjects(projects);
        const loadedProjects = loadProjects();

        expect(loadedProjects[0].addedAt).toBe(timestamp);

        cleanup();
      });
    });
  });

  describe('File Tree Helpers', () => {
    describe('isHidden', () => {
      it('should return true for hidden files', () => {
        expect(isHidden('.env')).toBe(true);
        expect(isHidden('.git')).toBe(true);
        expect(isHidden('.hidden')).toBe(true);
      });

      it('should return false for non-hidden files', () => {
        expect(isHidden('README.md')).toBe(false);
        expect(isHidden('src')).toBe(false);
        expect(isHidden('file.txt')).toBe(false);
      });
    });

    describe('buildFileTree', () => {
      it('should build file tree from directory structure', () => {
        const mockFiles = createTestProjectStructure('/mock/project', [
          { name: 'Agent 1', type: 'chat', description: 'Test' },
        ]);

        // Add some nested files
        mockFiles['/mock/project/src/index.ts'] = '';
        mockFiles['/mock/project/src/utils/helpers.ts'] = '';
        mockFiles['/mock/project/README.md'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/mock/project', { excludeHidden: true });

        // Should have at least src directory and README.md
        expect(fileTree.length).toBeGreaterThan(0);

        const srcDir = fileTree.find((node: any) => node.name === 'src');
        expect(srcDir).toBeDefined();
        expect(srcDir.type).toBe('directory');

        cleanup();
      });

      it('should respect maxDepth option', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/a/b/c/d/file.txt'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/mock/project', { maxDepth: 2 });

        // Find directory 'a'
        const aDir = fileTree.find((node: any) => node.name === 'a');
        expect(aDir).toBeDefined();

        // Should not explore beyond maxDepth
        if (aDir && aDir.children) {
          const bDir = aDir.children.find((node: any) => node.name === 'b');
          expect(bDir).toBeDefined();
          // At maxDepth 2, 'c' should not be explored
          if (bDir && bDir.children) {
            expect(bDir.children.length).toBe(0);
          }
        }

        cleanup();
      });

      it('should filter hidden files when excludeHidden is true', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/.env'] = '';
        mockFiles['/mock/project/.git/config'] = '';
        mockFiles['/mock/project/README.md'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/mock/project', { excludeHidden: true });

        const fileNames = fileTree.map((node: any) => node.name);
        expect(fileNames).toContain('README.md');
        expect(fileNames).not.toContain('.env');
        expect(fileNames).not.toContain('.git');

        cleanup();
      });

      it('should filter by extension when includeExtensions is specified', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/file1.txt'] = '';
        mockFiles['/mock/project/file2.md'] = '';
        mockFiles['/mock/project/file3.js'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/mock/project', {
          includeExtensions: ['.txt', '.md'],
        });

        const fileNames = fileTree.map((node: any) => node.name);
        expect(fileNames).toContain('file1.txt');
        expect(fileNames).toContain('file2.md');
        expect(fileNames).not.toContain('file3.js');

        cleanup();
      });

      it('should handle non-existent directory gracefully', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/nonexistent', {});
        expect(fileTree).toEqual([]);

        cleanup();
      });

      it('should sort directories before files', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/zebra.txt'] = '';
        mockFiles['/mock/project/apple'] = ''; // Directory
        mockFiles['/mock/project/banana.txt'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const fileTree = buildFileTree('/mock/project', {});

        // First item should be a directory (alphabetically)
        const firstItem = fileTree[0];
        expect(firstItem.name).toBe('apple');
        expect(firstItem.type).toBe('directory');

        cleanup();
      });
    });

    describe('listFilesRecursive', () => {
      it('should list all files recursively', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/file1.txt'] = '';
        mockFiles['/mock/project/src/file2.md'] = '';
        mockFiles['/mock/project/src/utils/file3.txt'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const files = listFilesRecursive('/mock/project', {
          extensions: ['.txt', '.md'],
        });

        expect(files.length).toBeGreaterThanOrEqual(3);
        const fileNames = files.map((f: any) => f.name);
        expect(fileNames).toContain('file1.txt');
        expect(fileNames).toContain('file2.md');
        expect(fileNames).toContain('file3.txt');

        cleanup();
      });

      it('should filter by extension', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/file.txt'] = '';
        mockFiles['/mock/project/file.md'] = '';
        mockFiles['/mock/project/file.js'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const files = listFilesRecursive('/mock/project', {
          extensions: ['.txt'],
        });

        expect(files).toHaveLength(1);
        expect(files[0].name).toBe('file.txt');

        cleanup();
      });

      it('should respect maxDepth limit', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/a/b/c/file.txt'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const files = listFilesRecursive('/mock/project', {
          maxDepth: 2,
        });

        // Should not find file at depth 3
        const deepFile = files.find((f: any) => f.name === 'file.txt');
        expect(deepFile).toBeUndefined();

        cleanup();
      });

      it('should handle non-existent directory gracefully', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const files = listFilesRecursive('/nonexistent', {});
        expect(files).toEqual([]);

        cleanup();
      });

      it('should sort files alphabetically', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        mockFiles['/mock/project/zebra.txt'] = '';
        mockFiles['/mock/project/apple.txt'] = '';
        mockFiles['/mock/project/banana.txt'] = '';

        const { cleanup } = setupMockFS(mockFiles);

        const files = listFilesRecursive('/mock/project', {});

        expect(files[0].name).toBe('apple.txt');
        expect(files[1].name).toBe('banana.txt');
        expect(files[2].name).toBe('zebra.txt');

        cleanup();
      });
    });
  });
});
