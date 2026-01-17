import * as fs from 'fs';
import { jest } from '@jest/globals';

// Global mock file storage
let mockFilesStore: Record<string, string> = {};
let fsMocksSetup = false;

/**
 * Reset the global mock file storage
 */
export function clearMockFiles() {
  mockFilesStore = {};
}

/**
 * Setup mock file system for a test
 * Uses Jest's manual mocks to override fs module functions
 */
export function setupMockFS(mockFiles: Record<string, string> = {}) {
  // Set the global mock files
  mockFilesStore = { ...mockFiles };

  // Only setup mocks once globally
  if (!fsMocksSetup) {
    fsMocksSetup = true;

    // Mock existsSync
    jest.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
      // Check if it's in our mock files
      if (mockFilesStore.hasOwnProperty(filePath)) {
        return true;
      }
      // Check if it's a directory (ends with / or is a prefix of some file)
      const dirPath = filePath.endsWith('/') ? filePath : filePath + '/';
      const isDir = Object.keys(mockFilesStore).some(f => f.startsWith(dirPath));
      if (isDir) {
        return true;
      }
      // Check for common directories
      if (filePath === '/mock' || filePath === '/mock/userdata' || filePath.includes('project')) {
        return true;
      }
      return false;
    });

    // Mock readFileSync
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, _encoding: any) => {
      if (mockFilesStore.hasOwnProperty(filePath)) {
        return mockFilesStore[filePath];
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Mock writeFileSync
    jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath: any, content: any) => {
      mockFilesStore[filePath] = content;
    });

    // Mock readdirSync
    (jest.spyOn(fs, 'readdirSync') as any).mockImplementation((dirPath: any) => {
      // Get all files in this directory
      const normalizedPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
      const filesInDir = Object.keys(mockFilesStore)
        .filter(f => {
          const dir = f.substring(0, f.lastIndexOf('/'));
          return dir === normalizedPath;
        })
        .map(f => f.substring(f.lastIndexOf('/') + 1));

      // Also add subdirectories
      const subdirs = new Set<string>();
      Object.keys(mockFilesStore).forEach(f => {
        const parts = f.split('/');
        if (parts.length > 1) {
          const currentDir = parts.slice(0, -1).join('/');
          if (currentDir.startsWith(normalizedPath) && currentDir !== normalizedPath) {
            const nextPart = currentDir.substring(normalizedPath.length + 1).split('/')[0];
            if (nextPart) {
              subdirs.add(nextPart);
            }
          }
        }
      });

      return [...filesInDir, ...Array.from(subdirs)];
    });

    // Mock statSync
    (jest.spyOn(fs, 'statSync') as any).mockImplementation((filePath: any) => {
      if (mockFilesStore.hasOwnProperty(filePath)) {
        return {
          isFile: () => true,
          isDirectory: () => false,
          size: mockFilesStore[filePath].length,
        } as any;
      }
      // Assume it's a directory for project paths or common directories
      if (filePath.includes('project') || filePath === '/mock' || filePath === '/mock/userdata') {
        return {
          isFile: () => false,
          isDirectory: () => true,
        } as any;
      }
      // Check if it's a parent directory of some file
      const normalizedPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
      const isParentDir = Object.keys(mockFilesStore).some(f => f.startsWith(normalizedPath + '/'));
      if (isParentDir) {
        return {
          isFile: () => false,
          isDirectory: () => true,
        } as any;
      }
      throw new Error(`Path not found: ${filePath}`);
    });

    // Mock unlinkSync
    jest.spyOn(fs, 'unlinkSync').mockImplementation((filePath: any) => {
      delete mockFilesStore[filePath];
    });
  }

  // Return cleanup function that just clears the store
  return {
    mockFiles: mockFilesStore,
    cleanup: () => {
      clearMockFiles();
    },
  };
}

/**
 * Setup mock path module for predictable path operations
 */
export function setupMockPath() {
  // These are already mocked in jest.setup.ts, so we don't need to do anything here
  return {
    cleanup: () => {
      // No-op since path is mocked globally
    },
  };
}
