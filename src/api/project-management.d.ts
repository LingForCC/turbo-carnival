/**
 * Project Management Type Definitions
 * Contains all types and interfaces related to project management functionality
 */

/**
 * Project interface representing a folder on disk
 */
export interface Project {
  path: string;      // Full absolute path to the folder
  name: string;      // Folder name only (e.g., "my-project")
  addedAt: number;   // Timestamp when added (for sorting)
}

/**
 * File system node type discriminator
 */
export type FileType = 'file' | 'directory';

/**
 * Represents a node in the file tree (file or directory)
 */
export interface FileTreeNode {
  name: string;              // File/directory name with extension
  path: string;              // Full absolute path
  type: FileType;            // 'file' or 'directory'
  children?: FileTreeNode[]; // Only present for directories
  expanded?: boolean;        // UI state: whether directory is expanded
}

/**
 * Options for file tree traversal
 */
export interface FileTreeOptions {
  maxDepth?: number;           // Maximum recursion depth (default: unlimited)
  excludeHidden?: boolean;     // Filter out hidden files (default: true)
  includeExtensions?: string[]; // Only include certain extensions (optional)
}

/**
 * File reference for @mention in chat
 */
export interface FileReference {
  name: string;        // File name (e.g., "README.md")
  path: string;        // Full absolute path
  extension: string;   // File extension (e.g., ".md", ".txt")
}

/**
 * File content with metadata
 */
export interface FileContent {
  path: string;        // Full absolute path
  name: string;        // File name
  content: string;     // File content as text
  size: number;        // File size in bytes
  error?: string;      // Error message if read failed
}

/**
 * Options for file listing
 */
export interface FileListOptions {
  extensions?: string[];  // Filter by extensions (e.g., ['.txt', '.md'])
  maxDepth?: number;      // Maximum directory depth to search
  excludeHidden?: boolean; // Exclude hidden files (default: true)
}

/**
 * Project Management API interface
 * Defines the contract for project management operations
 * Used by renderer components to interact with project management functionality
 */
export interface ProjectManagementAPI {
  /**
   * Open folder picker dialog
   * @returns Promise resolving to selected folder path or null if cancelled
   */
  openFolderDialog(): Promise<string | null>;

  /**
   * Get all saved projects
   * @returns Promise resolving to array of projects
   */
  getProjects(): Promise<Project[]>;

  /**
   * Add a new project
   * @param folderPath - Full path to the project folder
   * @returns Promise resolving to updated array of projects
   */
  addProject(folderPath: string): Promise<Project[]>;

  /**
   * Remove a project
   * @param folderPath - Full path to the project folder to remove
   * @returns Promise resolving to updated array of projects
   */
  removeProject(folderPath: string): Promise<Project[]>;

  /**
   * Get file tree for a project
   * @param projectPath - Full path to the project folder
   * @param options - Optional file tree traversal options
   * @returns Promise resolving to file tree nodes
   */
  getFileTree(projectPath: string, options?: FileTreeOptions): Promise<FileTreeNode[]>;

  /**
   * List all .txt and .md files in project
   * @param projectPath - Full path to the project folder
   * @param options - Optional file listing options
   * @returns Promise resolving to array of file references
   */
  listProjectFiles(projectPath: string, options?: FileListOptions): Promise<FileReference[]>;

  /**
   * Read multiple files at once
   * @param filePaths - Array of full file paths to read
   * @returns Promise resolving to array of file contents
   */
  readFileContents(filePaths: string[]): Promise<FileContent[]>;

  /**
   * Save assistant message to project folder
   * @param projectPath - Full path to the project folder
   * @param content - Message content to save
   * @returns Promise resolving to saved file path or null if failed
   */
  saveMessageToFile(projectPath: string, content: string): Promise<string | null>;

  /**
   * Listen for project file updates
   * @param callback - Function to call when project files are updated
   */
  onProjectFileUpdated(callback: (data: { projectPath: string; filePath: string }) => void): void;
}

