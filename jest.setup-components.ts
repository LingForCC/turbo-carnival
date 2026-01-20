/**
 * Global setup file for web component tests
 * This file runs before each test suite in the web-components project
 */

// Mock window.electronAPI for all component tests
const mockElectronAPI = {
  platform: 'darwin',

  // Project methods
  openFolderDialog: jest.fn(),
  getProjects: jest.fn(),
  addProject: jest.fn(),
  removeProject: jest.fn(),

  // Agent methods
  getAgents: jest.fn(),
  addAgent: jest.fn(),
  removeAgent: jest.fn(),
  updateAgent: jest.fn(),

  // API Key methods
  getAPIKeys: jest.fn(),
  addAPIKey: jest.fn(),
  removeAPIKey: jest.fn(),

  // Tool methods
  getTools: jest.fn(),
  addTool: jest.fn(),
  updateTool: jest.fn(),
  removeTool: jest.fn(),
  executeTool: jest.fn(),
  onBrowserToolExecution: jest.fn(),
  sendBrowserToolResult: jest.fn(),

  // Project detail methods
  getFileTree: jest.fn(),
  listProjectFiles: jest.fn(),
  readFileContents: jest.fn(),

  // Chat methods
  sendChatMessage: jest.fn(),
  streamChatMessage: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Clear mocks and clean DOM before each test
beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});
