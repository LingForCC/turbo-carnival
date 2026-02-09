/**
 * Snippet Management Type Definitions
 * Contains all types and interfaces related to the snippets feature
 */

/**
 * Snippet file metadata
 */
export interface SnippetFile {
  fileName: string;      // Full filename with .txt extension
  name: string;          // User-visible name (without extension)
  content: string;       // Snippet content
  createdAt: number;     // File creation timestamp
  modifiedAt: number;    // File modification timestamp
}

/**
 * Snippet Management API interface
 * Defines the contract for snippet management operations
 * Used by renderer components to interact with snippet functionality
 */
export interface SnippetManagementAPI {
  /**
   * Get list of snippet files in save location
   * @returns Promise resolving to array of snippet files
   * @throws Error if save location not configured
   */
  getSnippetFiles(): Promise<SnippetFile[]>;

  /**
   * Read snippet file content
   * @param fileName - Full filename (with .txt extension)
   * @returns Promise resolving to file content as string
   */
  readSnippetFile(fileName: string): Promise<string>;

  /**
   * Create new snippet file with user-provided name
   * @param name - User-provided snippet name
   * @param content - Initial content for the snippet
   * @returns Promise resolving to created snippet file metadata
   * @throws Error if save location not configured
   */
  createSnippetFile(name: string, content: string): Promise<SnippetFile>;

  /**
   * Save snippet content (auto-save)
   * @param fileName - Full filename (with .txt extension)
   * @param content - Content to save
   * @returns Promise that resolves when save is complete
   */
  saveSnippetContent(fileName: string, content: string): Promise<void>;

  /**
   * Rename snippet file
   * @param oldName - Current filename (with .txt extension)
   * @param newName - New name for the snippet (without extension)
   * @returns Promise that resolves when rename is complete
   */
  renameSnippetFile(oldName: string, newName: string): Promise<void>;

  /**
   * Delete snippet file
   * @param fileName - Full filename (with .txt extension)
   * @returns Promise that resolves when deletion is complete
   */
  deleteSnippetFile(fileName: string): Promise<void>;
}
