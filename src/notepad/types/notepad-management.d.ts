/**
 * Notepad Management Type Definitions
 * Contains all types and interfaces related to the quick notepad feature
 */

/**
 * Notepad file metadata
 */
export interface NotepadFile {
  name: string;
  path: string;
  modifiedAt: number; // Timestamp (milliseconds since epoch)
}

/**
 * Notepad content
 */
export interface NotepadContent {
  filePath: string;
  content: string;
}

/**
 * Notepad Management API interface
 * Defines the contract for notepad management operations
 * Used by renderer components to interact with notepad functionality
 */
export interface NotepadManagementAPI {
  /**
   * Get list of notepad files in save location
   * @returns Promise resolving to array of notepad files
   * @throws Error if save location not configured
   */
  getFiles(): Promise<NotepadFile[]>;

  /**
   * Read notepad file content
   * @param filePath - Full path to the notepad file
   * @returns Promise resolving to file content as string
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Create new notepad file with timestamp-based name
   * @returns Promise resolving to created notepad file metadata
   * @throws Error if save location not configured
   */
  createFile(): Promise<NotepadFile>;

  /**
   * Save notepad content (auto-save)
   * @param filePath - Full path to the notepad file
   * @param content - Content to save
   * @returns Promise that resolves when save is complete
   */
  saveContent(filePath: string, content: string): Promise<void>;

  /**
   * Delete notepad file
   * @param filePath - Full path to the notepad file
   * @returns Promise that resolves when deletion is complete
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Register callback for when notepad window is shown
   * @param callback - Function to call when window is shown
   * @returns Unsubscribe function to remove the listener
   */
  onWindowShown(callback: () => void): () => void;
}
