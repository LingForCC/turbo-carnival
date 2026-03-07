/**
 * Conversation Feature Architecture Tests
 *
 * Architecture rules specific to the conversation feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Conversation Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('conversation module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('conversation')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('conversation feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('conversation/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('conversation/main');

      await expect(rule).toPassAsync();
    });
  });
});
