// Global test setup for Jest
import { jest } from '@jest/globals';

// Mock Electron modules globally
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userdata'),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
  BrowserWindow: jest.fn(),
}));

// Mock path module globally
jest.mock('path', () => ({
  join: jest.fn((...args: any[]) => args.filter(Boolean).join('/')),
  basename: jest.fn((p: any) => String(p).split('/').pop() || ''),
  extname: jest.fn((p: any) => {
    const parts = String(p).split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }),
  dirname: jest.fn((p: any) => {
    const parts = String(p).split('/');
    parts.pop();
    return parts.join('/') || '.';
  }),
  sep: '/',
  delimiter: ':',
}));

// Set test environment variable
process.env.NODE_ENV = 'test';
