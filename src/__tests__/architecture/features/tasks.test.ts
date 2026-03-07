/**
 * Tasks Feature Architecture Tests
 *
 * Architecture rules specific to the tasks feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Tasks Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('tasks module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('tasks')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('tasks feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('tasks/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('tasks/main');

      await expect(rule).toPassAsync();
    });
  });
});
