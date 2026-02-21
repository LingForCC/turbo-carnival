// Mocks are set up in jest.setup.ts
import {
  getSettingsPath,
  loadSettings,
  saveSettings,
  updateSettingsFields,
} from '../../../settings/main/settings-management';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';
import type { AppSettings } from '../../../settings/types';

// Mock app.getPath returns '/mock/userdata' for userData
const STORAGE_DIR = '/mock/userdata';

describe('Settings Management - Storage Helpers', () => {
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

  describe('getSettingsPath', () => {
    it('should return correct settings.json path', () => {
      const settingsPath = getSettingsPath();
      expect(settingsPath).toBe(`${STORAGE_DIR}/settings.json`);
    });
  });

  describe('saveSettings and loadSettings', () => {
    it('should save and load settings successfully', () => {
      const { cleanup } = setupMockFS({});

      const settings: AppSettings = {
        theme: 'dark',
      };

      // Save settings
      saveSettings(settings);

      // Load settings
      const loadedSettings = loadSettings();
      expect(loadedSettings).toEqual({ theme: 'dark' });

      cleanup();
    });

    it('should return default settings when settings.json does not exist', () => {
      const { cleanup } = setupMockFS({});

      const settings = loadSettings();
      expect(settings).toEqual({ theme: 'light', snippetSaveLocation: null });

      cleanup();
    });

    it('should handle corrupted JSON gracefully', () => {
      const mockFiles: Record<string, string> = {
        [`${STORAGE_DIR}/settings.json`]: 'invalid json{{{',
      };
      const { cleanup } = setupMockFS(mockFiles);

      const settings = loadSettings();
      expect(settings).toEqual({ theme: 'light', snippetSaveLocation: null });

      cleanup();
    });

    it('should handle missing settings property', () => {
      const mockFiles: Record<string, string> = {
        [`${STORAGE_DIR}/settings.json`]: JSON.stringify({ wrongKey: { theme: 'dark' } }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const settings = loadSettings();
      expect(settings).toEqual({ theme: 'light', snippetSaveLocation: null });

      cleanup();
    });
  });

  describe('updateSettingsFields', () => {
    it('should update specific fields with default settings', () => {
      const { cleanup } = setupMockFS({});

      const updated = updateSettingsFields({ theme: 'dark' });
      expect(updated).toEqual({ theme: 'dark', snippetSaveLocation: null });

      // Verify it was saved
      const loaded = loadSettings();
      expect(loaded).toEqual({ theme: 'dark', snippetSaveLocation: null });

      cleanup();
    });

    it('should merge with existing settings', () => {
      const mockFiles: Record<string, string> = {
        [`${STORAGE_DIR}/settings.json`]: JSON.stringify({
          settings: { theme: 'light', snippetSaveLocation: '/some/path' }
        }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      const updated = updateSettingsFields({ theme: 'dark' });
      expect(updated).toEqual({ theme: 'dark', snippetSaveLocation: '/some/path' });

      // Verify it was saved
      const loaded = loadSettings();
      expect(loaded).toEqual({ theme: 'dark', snippetSaveLocation: '/some/path' });

      cleanup();
    });

    it('should preserve existing fields when updating partial settings', () => {
      // This test verifies that partial updates preserve existing fields
      const mockFiles: Record<string, string> = {
        [`${STORAGE_DIR}/settings.json`]: JSON.stringify({
          settings: { theme: 'light', snippetSaveLocation: '/test/path' }
        }),
      };
      const { cleanup } = setupMockFS(mockFiles);

      // Update only theme field
      const updated = updateSettingsFields({ theme: 'dark' });
      expect(updated).toEqual({ theme: 'dark', snippetSaveLocation: '/test/path' });

      cleanup();
    });
  });
});
