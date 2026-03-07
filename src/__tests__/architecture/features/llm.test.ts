/**
 * LLM Feature Architecture Tests
 *
 * Architecture rules specific to the LLM feature module.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('LLM Feature Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('llm module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('llm')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Isolation', () => {
    it('llm feature components should not depend on main process', async () => {
      const rule = filesOfProject()
        .inFolder('llm/components')
        .shouldNot()
        .dependOnFiles()
        .inFolder('llm/main');

      await expect(rule).toPassAsync();
    });
  });
});
