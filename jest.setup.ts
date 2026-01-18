// Global test setup for Jest

// Set up mocks before any imports
jest.mock('fs', () => {
  // In-memory file store for mocking
  const mockFiles: Record<string, string> = {};

  // Expose a way to clear the mock files globally
  (global as any).__clearMockFsFiles = () => {
    Object.keys(mockFiles).forEach(key => {
      delete mockFiles[key];
    });
  };

  const existsSync = function(filePath: any) {
    if (mockFiles.hasOwnProperty(filePath)) {
      return true;
    }
    const dirPath = filePath.endsWith('/') ? filePath : filePath + '/';
    const isDir = Object.keys(mockFiles).some(f => f.startsWith(dirPath));
    if (isDir) {
      return true;
    }
    if (filePath === '/mock' || filePath === '/mock/userdata' || filePath.includes('project')) {
      return true;
    }
    return false;
  };

  const readFileSync = function(filePath: any, _encoding: any) {
    if (mockFiles.hasOwnProperty(filePath)) {
      return mockFiles[filePath];
    }
    throw new Error(`File not found: ${filePath}`);
  };

  const writeFileSync = function(filePath: any, content: any) {
    mockFiles[filePath] = content;
  };

  const readdirSync = function(dirPath: any) {
    const normalizedPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
    const filesInDir = Object.keys(mockFiles)
      .filter(f => {
        const dir = f.substring(0, f.lastIndexOf('/'));
        return dir === normalizedPath;
      })
      .map(f => f.substring(f.lastIndexOf('/') + 1));

    const subdirs = new Set<string>();
    Object.keys(mockFiles).forEach(f => {
      const parts = f.split('/');
      if (parts.length > 1) {
        const currentDir = parts.slice(0, -1).join('/');
        if (currentDir.startsWith(normalizedPath) && currentDir !== normalizedPath) {
          const nextPart = currentDir.substring(normalizedPath.length + 1).split('/')[0];
          if (nextPart) {
            subdirs.add(nextPart);
          }
        }
      }
    });

    return [...filesInDir, ...Array.from(subdirs)];
  };

  const statSync = function(filePath: any) {
    if (mockFiles.hasOwnProperty(filePath)) {
      return {
        isFile: () => true,
        isDirectory: () => false,
        size: mockFiles[filePath].length,
      } as any;
    }
    if (filePath.includes('project') || filePath === '/mock' || filePath === '/mock/userdata') {
      return {
        isFile: () => false,
        isDirectory: () => true,
      } as any;
    }
    const normalizedPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
    const isParentDir = Object.keys(mockFiles).some(f => f.startsWith(normalizedPath + '/'));
    if (isParentDir) {
      return {
        isFile: () => false,
        isDirectory: () => true,
      } as any;
    }
    throw new Error(`Path not found: ${filePath}`);
  };

  const unlinkSync = function(filePath: any) {
    delete mockFiles[filePath];
  };

  const mkdirSync = function(path: any) {
    return path as string;
  };

  return {
    existsSync,
    readFileSync,
    writeFileSync,
    readdirSync,
    statSync,
    unlinkSync,
    mkdirSync,
    __esModule: true,
    default: {
      existsSync,
      readFileSync,
      writeFileSync,
      readdirSync,
      statSync,
      unlinkSync,
      mkdirSync,
    },
  };
});

jest.mock('electron', () => {
  const getPath = function(name: string) {
    return name === 'userData' ? '/mock/userdata' : '/mock';
  };

  return {
    app: {
      getPath,
      getName: () => 'Turbo Carnival',
      getVersion: () => '1.0.0',
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
    __esModule: true, // For esModuleInterop
    default: {
      app: { getPath },
    },
  };
});

// Path mock - return actual functions, not wrapped in jest.fn()
jest.mock('path', () => {
  const join = function(...args: any[]) {
    return args.filter(Boolean).join('/');
  };

  const basename = function(p: any) {
    return String(p).split('/').pop() || '';
  };

  const dirname = function(p: any) {
    const parts = String(p).split('/');
    parts.pop();
    return parts.join('/') || '.';
  };

  const extname = function(p: any) {
    const parts = String(p).split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  };

  return {
    join,
    basename,
    dirname,
    extname,
    sep: '/',
    delimiter: ':',
    relative: jest.fn((from: any, to: any) => to),
    resolve: jest.fn((...args: any[]) => args.filter(Boolean).join('/')),
    normalize: jest.fn((p: any) => p),
    isAbsolute: jest.fn((p: any) => String(p).startsWith('/')),
    parse: jest.fn((p: any) => ({ root: '', dir: '', base: p, ext: '', name: p })),
    format: jest.fn((p: any) => p),
    __esModule: true, // For esModuleInterop
    default: { join, basename, dirname, extname, sep: '/', delimiter: ':' },
  };
});

// Set test environment variable
process.env.NODE_ENV = 'test';

// Clear mock files before each test to prevent state leakage
beforeEach(() => {
  if ((global as any).__clearMockFsFiles) {
    (global as any).__clearMockFsFiles();
  }
});
