/**
 * Core Module Architecture Tests
 *
 * Architecture rules specific to the core module.
 * Core contains shared utilities and storage logic.
 */

import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

jest.setTimeout(120000);

describe('Core Module Architecture', () => {
  describe('Cyclic Dependencies', () => {
    it('core module should be cycle free', async () => {
      const rule = filesOfProject()
        .inFolder('core')
        .should()
        .beFreeOfCycles();

      await expect(rule).toPassAsync();
    });
  });
});
