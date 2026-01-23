/**
 * Global setup file for web component tests
 * This file runs before each test suite in the web-components project
 */

// Mock marked library
jest.mock('marked', () => ({
  marked: {
    parse: jest.fn((content: string) => `<p>${content}</p>`),
  },
}));

// Mock DOMPurify library
jest.mock('dompurify', () => ({
  default: {
    sanitize: jest.fn((html: string) => html),
  },
}));

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

// Mock alert for Happy DOM (which doesn't have it by default)
// Use the same function reference for both window.alert and global alert
const alertMock = jest.fn();
Object.defineProperty(window, 'alert', {
  value: alertMock,
  writable: true,
  configurable: true,
});

// Also add to global scope for direct alert() calls
(global as any).alert = alertMock;

// Clear mocks and clean DOM before each test
beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});
