import * as fs from 'fs';

/**
 * Get access to the in-memory file store from the global fs mock
 * This allows tests to pre-populate files before running tests
 */
function getMockFilesStore(): Record<string, string> {
  // Since fs is mocked globally, we can use writeFileSync to populate files
  // We'll keep a local reference for test setup
  const store: Record<string, string> = {};

  return store;
}

// Local cache of files that should exist for each test
let testFilesStore: Record<string, string> = {};

/**
 * Reset the test file store
 */
export function clearMockFiles() {
  testFilesStore = {};
}

/**
 * Setup mock file system for a test
 * Populates the in-memory file store with initial test data
 */
export function setupMockFS(mockFiles: Record<string, string> = {}) {
  // Clear any existing files
  testFilesStore = {};

  // Set the initial files for this test
  testFilesStore = { ...mockFiles };

  // Write all initial files to the mocked fs
  Object.entries(mockFiles).forEach(([filePath, content]) => {
    try {
      (fs.writeFileSync as any)(filePath, content);
    } catch (e) {
      // Ignore errors - file might already exist
    }
  });

  // Return cleanup function
  return {
    mockFiles: testFilesStore,
    cleanup: () => {
      clearMockFiles();
      // Optionally clear the global fs mock too by writing empty content
      // Note: We can't actually delete from the global mock since it's a closure
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

/**
 * Utility: Add a file to the mock file system during a test
 */
export function addMockFile(filePath: string, content: string) {
  testFilesStore[filePath] = content;
  try {
    (fs.writeFileSync as any)(filePath, content);
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Utility: Get a file from the mock file system during a test
 */
export function getMockFile(filePath: string): string | undefined {
  try {
    return (fs.readFileSync as any)(filePath, 'utf-8');
  } catch (e) {
    return undefined;
  }
}
