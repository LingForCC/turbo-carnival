/**
 * Agent Feature Architecture Tests
 *
 * Architecture rules specific to the agent feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Agent Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('agent module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('agent')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('agent feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('agent/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('agent/main');

      await expect(rule).toPassAsync();
    });
  });
});
