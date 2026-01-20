import type { Project, Agent, APIKey, App } from '../../global.d';

/**
 * Create a mock APIKey object with optional overrides
 */
export function createMockAPIKey(overrides: Partial<APIKey> = {}): APIKey {
  return {
    name: 'test-api-key',
    apiKey: 'sk-test-key-1234567890',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create multiple mock API keys at once
 */
export function createMockAPIKeys(count: number, baseOverrides: Partial<APIKey> = {}): APIKey[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAPIKey({
      name: `test-api-key-${i + 1}`,
      apiKey: `sk-test-key-${i + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create a mock Project object with optional overrides
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    path: '/mock/projects/test-project',
    name: 'test-project',
    addedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock Agent object with optional overrides
 */
export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    name: 'Test Agent',
    type: 'chat',
    description: 'A test agent',
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
    },
    prompts: {
      system: 'You are a helpful assistant',
    },
    history: [],
    settings: {},
    ...overrides,
  };
}

/**
 * Create multiple mock agents at once
 */
export function createMockAgents(count: number, baseOverrides: Partial<Agent> = {}): Agent[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAgent({
      name: `Test Agent ${i + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create a mock file system object with in-memory storage
 * This provides a simple in-memory file system for testing
 */
export function createMockFileSystem() {
  const files = new Map<string, string>();
  const directories = new Set<string>(['/mock']);

  return {
    // File operations
    writeFile: (path: string, content: string) => {
      files.set(path, content);
    },
    readFile: (path: string) => {
      return files.get(path) || null;
    },
    existsFile: (path: string) => {
      return files.has(path);
    },
    deleteFile: (path: string) => {
      files.delete(path);
    },

    // Directory operations
    addDirectory: (path: string) => {
      directories.add(path);
    },
    existsDirectory: (path: string) => {
      return directories.has(path);
    },
    listDirectory: (path: string) => {
      const allPaths = Array.from(files.keys()).concat(Array.from(directories));
      return allPaths
        .filter(p => p.startsWith(path))
        .map(p => p.replace(path + '/', '').split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i);
    },

    // Utilities
    clear: () => {
      files.clear();
      directories.clear();
      directories.add('/mock');
    },
    getAllFiles: () => {
      return Array.from(files.entries());
    },
  };
}

/**
 * Create test data for a project with agents
 * Returns a mock files object with project structure
 */
export function createTestProjectStructure(projectPath: string, agents: any[] = []): Record<string, string> {
  const mockFiles: Record<string, string> = {};

  // Add agent files
  agents.forEach((agent) => {
    const sanitizedName = agent.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const agentPath = `${projectPath}/agent-${sanitizedName}.json`;
    mockFiles[agentPath] = JSON.stringify(agent, null, 2);
  });

  return mockFiles;
}

/**
 * Create a mock App object with optional overrides
 */
export function createMockApp(overrides: Partial<App> = {}): App {
  const now = Date.now();
  return {
    name: 'Test App',
    agentName: 'Test Agent',
    html: '<div>Test App HTML</div>',
    rendererCode: '// Renderer code\nconsole.log("test");',
    mainCode: '// Main code',
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple mock apps at once
 */
export function createMockApps(count: number, baseOverrides: Partial<App> = {}): App[] {
  return Array.from({ length: count }, (_, i) =>
    createMockApp({
      name: `Test App ${i + 1}`,
      agentName: `Test Agent ${i + 1}`,
      ...baseOverrides,
    })
  );
}
