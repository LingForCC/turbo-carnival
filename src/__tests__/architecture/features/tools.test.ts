/**
 * Tools Feature Architecture Tests
 *
 * Architecture rules specific to the tools feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Tools Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('tools module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('tools')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('tools feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('tools/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('tools/main');

      await expect(rule).toPassAsync();
    });
  });
});
