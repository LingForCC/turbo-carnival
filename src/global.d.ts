// Global TypeScript declarations for Turbo Carnival

/**
 * Project interface representing a folder on disk
 */
export interface Project {
  path: string;      // Full absolute path to the folder
  name: string;      // Folder name only (e.g., "my-project")
  addedAt: number;   // Timestamp when added (for sorting)
}

interface ElectronAPI {
  platform: string;
  openFolderDialog: () => Promise<string | null>;
  getProjects: () => Promise<Project[]>;
  addProject: (path: string) => Promise<Project[]>;
  removeProject: (path: string) => Promise<Project[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
