// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import {
  loadProjectsFromFolder,
} from '../../../project/main/project-management';
import { createMockProject } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { Project } from '../../../project/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Project Management - Folder-Based Loading', () => {
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

  describe('loadProjectsFromFolder', () => {
    it('should return empty array when folder does not exist', () => {
      const projects = loadProjectsFromFolder('/nonexistent-folder');
      expect(projects).toEqual([]);
    });

    it('should return empty array when folder is empty', () => {
      // Create an empty folder by not adding any files under it
      const projects = loadProjectsFromFolder('/empty-folder');
      // The mock returns empty if no files exist under that path
      expect(projects).toEqual([]);
    });

    it('should load subfolders as projects', () => {
      // Setup mock files to simulate folder structure
      const { cleanup } = setupMockFS({
        '/project-folder/project1/.gitkeep': '',
        '/project-folder/project2/.gitkeep': '',
        '/project-folder/file.txt': 'some content',
      });

      const projects = loadProjectsFromFolder('/project-folder');

      // Should only include directories, not files
      expect(projects).toHaveLength(2);
      const names = projects.map(p => p.name).sort();
      expect(names).toContain('project1');
      expect(names).toContain('project2');

      cleanup();
    });

    it('should exclude hidden folders starting with dot', () => {
      const { cleanup } = setupMockFS({
        '/project-folder/project1/.gitkeep': '',
        '/project-folder/.git/config': '',
        '/project-folder/.vscode/settings.json': '',
        '/project-folder/project2/.gitkeep': '',
      });

      const projects = loadProjectsFromFolder('/project-folder');

      // Should exclude .git and .vscode
      expect(projects).toHaveLength(2);
      const names = projects.map(p => p.name).sort();
      expect(names).toEqual(['project1', 'project2']);

      cleanup();
    });

    it('should sort projects alphabetically', () => {
      const { cleanup } = setupMockFS({
        '/project-folder/zebra/.gitkeep': '',
        '/project-folder/apple/.gitkeep': '',
        '/project-folder/mango/.gitkeep': '',
      });

      const projects = loadProjectsFromFolder('/project-folder');

      expect(projects[0].name).toBe('apple');
      expect(projects[1].name).toBe('mango');
      expect(projects[2].name).toBe('zebra');

      cleanup();
    });

    it('should include full path for each project', () => {
      const { cleanup } = setupMockFS({
        '/parent-folder/my-project/.gitkeep': '',
      });

      const projects = loadProjectsFromFolder('/parent-folder');

      expect(projects[0].path).toBe('/parent-folder/my-project');

      cleanup();
    });

    it('should return empty array when projectFolder is empty string', () => {
      const projects = loadProjectsFromFolder('');
      expect(projects).toEqual([]);
    });

    it('should return empty array when projectFolder is null', () => {
      const projects = loadProjectsFromFolder(null as any);
      expect(projects).toEqual([]);
    });
  });
});
