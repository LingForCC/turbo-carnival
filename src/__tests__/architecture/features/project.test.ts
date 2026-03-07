/**
 * Project Feature Architecture Tests
 *
 * Architecture rules specific to the project feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Project Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('project module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('project')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('project feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('project/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('project/main');

      await expect(rule).toPassAsync();
    });
  });
});
