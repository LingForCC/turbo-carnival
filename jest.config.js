module.exports = {
  // TypeScript preset
  preset: 'ts-jest',

  // Use projects to separate main process and component tests
  projects: [
    {
      // Main process tests (existing tests)
      displayName: 'main-process',
      testMatch: [
        '<rootDir>/src/__tests__/main/**/*.test.ts',
      ],
      testEnvironment: 'node',
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      clearMocks: true,
      resetMocks: true,
      restoreMocks: false,
      verbose: true,
    },
    {
      // Web component tests (new tests)
      displayName: 'web-components',
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.ts'],
      testEnvironment: '<rootDir>/jest-happy-dom-env.js',
      testEnvironmentOptions: {
        url: 'http://localhost:3000/',
      },
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/jest.setup-components.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      clearMocks: true,
      resetMocks: true,
      restoreMocks: false,
      verbose: true,
    },
  ],

  // Coverage configuration - applies to all projects
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tool-worker.ts',
    // Only exclude components we're not testing yet
    '!src/components/app-container.ts',
    '!src/components/chat-panel.ts',
    '!src/components/project-agent-dashboard.ts',
    '!src/components/project-detail-panel.ts',
    '!src/components/agent-form-dialog.ts',
    '!src/components/api-keys-dialog.ts',
    '!src/components/tools-dialog.ts',
    '!src/components/tool-test-dialog.ts',
  ],
};
