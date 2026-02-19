/**
 * Storage Resolver Module
 * Determines storage paths based on environment
 *
 * Production: Uses Electron's userData path (e.g., ~/Library/Application Support/turbo-carnival/)
 * Test (E2E): Uses TURBO_CARNIVAL_TEST_DATA_DIR env var for isolated testing
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Check if the app is running in E2E test mode
 */
export function isTestMode(): boolean {
  return !!process.env.TURBO_CARNIVAL_TEST_DATA_DIR;
}

/**
 * Get the base storage directory for all app data
 */
export function getStorageDir(): string {
  // Check for test mode first (for E2E testing via Playwright)
  if (isTestMode()) {
    const testPath = process.env.TURBO_CARNIVAL_TEST_DATA_DIR!;
    if (!fs.existsSync(testPath)) {
      fs.mkdirSync(testPath, { recursive: true });
    }
    return testPath;
  }

  // Use Electron's default userData path for production
  return app.getPath('userData');
}

/**
 * Get the full path for a settings file
 * @param filename - The name of the settings file (e.g., 'settings.json')
 */
export function getStoragePath(filename: string): string {
  return path.join(getStorageDir(), filename);
}

/**
 * Log the current storage configuration (useful for debugging)
 */
export function logStorageConfig(): void {
  const env = isTestMode() ? 'test' : 'production';
  console.log(`[Storage] Environment: ${env}`);
  console.log(`[Storage] Data directory: ${getStorageDir()}`);
}
