// Mocks are set up in jest.setup.ts
import * as electron from 'electron';
import {
  getProjectsPath,
  loadProjects,
  saveProjects,
} from '../../../main/project-management';
import { createMockProject } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { Project } from '../../../global.d';

describe('Project Management - Storage Helpers', () => {
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

  describe('getProjectsPath', () => {
    it('should return correct projects.json path', () => {
      
      const projectsPath = getProjectsPath();
      expect(projectsPath).toBe('/mock/userdata/projects.json');

    });
  });

  describe('saveProjects and loadProjects', () => {
    it('should save and load projects successfully', () => {
      const { cleanup } = setupMockFS({});

      const projects: Project[] = [
        createMockProject({ path: '/project1', name: 'project1' }),
        createMockProject({ path: '/project2', name: 'project2' }),
      ];

      // Save projects
      saveProjects(projects);

      // Load projects
      const loadedProjects = loadProjects();
      expect(loadedProjects).toHaveLength(2);
      expect(loadedProjects[0].path).toBe('/project1');
      expect(loadedProjects[1].path).toBe('/project2');

      cleanup();
    });

    it('should return empty array when projects.json does not exist', () => {
      const { cleanup } = setupMockFS({});

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
      const { cleanup } = setupMockFS({});

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
