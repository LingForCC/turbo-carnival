/**
 * Architecture Tests for Turbo Carnival
 *
 * These tests enforce architectural conventions documented in docs/architecture.md
 * Using tsarch library to validate layer dependencies and module structure.
 *
 * Architecture Rules:
 * 1. Feature-based module structure with main/, components/, preload/, api/, types/ subdirectories
 * 2. Components (UI) should not depend on main process code directly
 * 3. API layer should not depend on main process implementation
 * 4. Main process code should not depend on renderer/UI code (except type-only imports)
 * 5. No circular dependencies within the codebase
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

// Architecture tests can take a while to finish
jest.setTimeout(120000);

describe('Architecture Rules', () => {
  describe('Layer Dependencies', () => {
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

  describe('Cyclic Dependencies', () => {
    // Note: These tests currently fail due to known circular dependencies.
    // They serve as documentation of issues that should be fixed.

    it('core module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('core')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('agent module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('agent')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('tools module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('tools')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('settings module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('settings')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('tasks module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('tasks')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('project module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('project')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('llm module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('llm')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });

    it('conversation module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('conversation')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Electron Process Isolation', () => {
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

  describe('Feature Module Isolation', () => {
    // Test features to ensure components don't depend on their own main process
    const testedFeatures = ['agent', 'llm', 'tools', 'settings', 'tasks'];

    testedFeatures.forEach((feature) => {
      it(`${feature} feature components should not depend on main process`, async () => {
        const rule = filesOfProject()
          .inFolder(`${feature}/components`)
          .shouldNot()
          .dependOnFiles()
          .inFolder(`${feature}/main`);

        await expect(rule).toPassAsync();
      });
    });
  });
});
