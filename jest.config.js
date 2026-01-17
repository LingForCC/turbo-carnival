module.exports = {
  // TypeScript preset
  preset: 'ts-jest',

  // Test environment for Node.js (main process)
  testEnvironment: 'node',

  // Module paths
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // TypeScript compilation
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module name mapper for absolute imports and .js extension resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.d.ts',
    '!src/renderer/**',  // Skip renderer tests initially
    '!src/components/**', // Skip components initially
    '!src/tool-worker.ts', // Skip worker file
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: false,  // We'll restore mocks manually in afterAll

  // Verbosity
  verbose: true,
};
