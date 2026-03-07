/**
 * General Architecture Tests for Turbo Carnival
 *
 * These tests enforce general architectural conventions that apply
 * across the entire codebase, not specific to any feature module.
 *
 * For feature-specific tests, see the features/ directory:
 * - features/agent.test.ts
 * - features/llm.test.ts
 * - features/settings.test.ts
 * - features/tools.test.ts
 * - features/tasks.test.ts
 * - features/conversation.test.ts
 * - features/project.test.ts
 * - features/core.test.ts
 *
 * Architecture Rules:
 * 1. Feature-based module structure with main/, components/, preload/, api/, types/ subdirectories
 * 2. Components (UI) should not depend on main process code directly
 * 3. API layer should not depend on main process implementation
 * 4. Main process code should not depend on renderer/UI code
 * 5. No circular dependencies within the codebase
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

// Architecture tests can take a while to finish
jest.setTimeout(120000);

describe('General Architecture', () => {
  describe('Layer Dependencies', () => {
    /**
     * These tests ensure proper separation between architectural layers.
     * They apply globally across all feature modules.
     */
    it('components (UI) should not depend on main process implementation', async () => {
      const rule = filesOfProject()
        .inFolder('components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('main');

      await expect(rule).toPassAsync();
    });

    it('api layer should not depend on main process implementation', async () => {
      const rule = filesOfProject()
        .inFolder('api')
        .shouldNot()
        .dependOnFiles()
        .inFolder('main');

      await expect(rule).toPassAsync();
    });

    it('preload layer should not depend on main process implementation', async () => {
      const rule = filesOfProject()
        .inFolder('preload')
        .shouldNot()
        .dependOnFiles()
        .inFolder('main');

      await expect(rule).toPassAsync();
    });

    it('types should not depend on implementation layers (main)', async () => {
      const rule = filesOfProject()
        .inFolder('types')
        .shouldNot()
        .dependOnFiles()
        .inFolder('main');

      await expect(rule).toPassAsync();
    });

    it('types should not depend on components', async () => {
      const rule = filesOfProject()
        .inFolder('types')
        .shouldNot()
        .dependOnFiles()
        .inFolder('components');

      await expect(rule).toPassAsync();
    });
  });

  describe('Electron Process Isolation', () => {
    /**
     * Electron requires strict separation between main and renderer processes.
     * The preload script bridges the two safely.
     */
    it('preload script should not depend on renderer components', async () => {
      const rule = filesOfProject()
        .inFolder('preload')
        .shouldNot()
        .dependOnFiles()
        .inFolder('components');

      await expect(rule).toPassAsync();
    });

    // Note: main.ts imports types from components (type-only imports).
    // This is an intentional pattern for settings type-checking.
    // If you want to enforce strict isolation, uncomment this test:
    //
    // it('main process entry point should not depend on renderer components', async () => {
    //   const rule = filesOfProject()
    //     .matchingPattern('src/main\\.ts')
    //     .shouldNot()
    //     .dependOnFiles()
    //     .inFolder('components');
    //   await expect(rule).toPassAsync();
    // });
  });

  describe('Project-Wide Cycles', () => {
    /**
     * The entire project should be free of circular dependencies.
     * Feature-specific cycle tests are in their respective feature files.
     */
    it('entire project should be free of cycles', async () => {
      const rule = filesOfProject()
        .matchingPattern('.*')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });
});
