/**
 * Settings Management Type Definitions
 * Contains all types and interfaces related to settings functionality
 */

/**
 * App settings for user preferences
 */
export interface AppSettings {
  theme: 'light' | 'dark';  // Theme preference
}

/**
 * Settings Management API interface
 * Defines the contract for settings management operations
 * Used by renderer components to interact with settings functionality
 */
export interface SettingsManagementAPI {
  /**
   * Get all settings
   * @returns Promise resolving to app settings
   */
  getSettings(): Promise<AppSettings>;

  /**
   * Update settings (supports partial updates)
   * @param updates - Partial settings object with fields to update
   * @returns Promise resolving to updated app settings
   */
  updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>;
}
