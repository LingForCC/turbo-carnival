/**
 * Settings Feature Architecture Tests
 *
 * Architecture rules specific to the settings feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Settings Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('settings module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('settings')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('settings feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('settings/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('settings/main');

      await expect(rule).toPassAsync();
    });
  });

  describe('Settings Access Rules', () => {
    it('components should only access settings through settings/api layer', async () => {
      // Components must not import directly from settings/main or settings/preload
      // They should only use settings/api which provides the renderer-safe interface
      const rule = filesOfProject()
        .inFolder('components')
        .shouldNot()
        .dependOnFiles()
        .matchingPattern('src/settings/(main|preload)/.*');

      await expect(rule).toPassAsync();
    });
  });
});
