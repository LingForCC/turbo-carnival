// Tests for agent deletion with app file cleanup
import { deleteAgent } from '../../../main/agent-management';
import { createMockAgent, createMockApp } from '../../helpers/mocks';
import { setupMockFS, clearMockFiles } from '../../helpers/file-system';

describe('Agent Deletion with App Cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    clearMockFiles();
  });

  describe('deleteAgent', () => {
    it('should delete agent file when agent is deleted', () => {
      const { cleanup } = setupMockFS({});

      const agent = createMockAgent({ name: 'Test Agent' });
      const fs = require('fs');

      // Create agent file manually
      fs.writeFileSync('/project/agent-test-agent.json', JSON.stringify(agent, null, 2));

      // Verify agent file exists
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(true);

      // Delete the agent
      deleteAgent('/project', 'Test Agent');

      // Verify agent file is deleted
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(false);

      cleanup();
    });

    it('should also delete app file when App-type agent is deleted', () => {
      const { cleanup } = setupMockFS({});

      const agent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const app = createMockApp({ agentName: 'Test Agent' });
      const fs = require('fs');

      // Create agent and app files
      fs.writeFileSync('/project/agent-test-agent.json', JSON.stringify(agent, null, 2));
      fs.writeFileSync('/project/app-test-agent.json', JSON.stringify(app, null, 2));

      // Verify both files exist
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(true);
      expect(fs.existsSync('/project/app-test-agent.json')).toBe(true);

      // Delete the agent
      deleteAgent('/project', 'Test Agent');

      // Verify both files are deleted
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(false);
      expect(fs.existsSync('/project/app-test-agent.json')).toBe(false);

      cleanup();
    });

    it('should not fail when deleting non-App agent (no app file)', () => {
      const { cleanup } = setupMockFS({});

      const agent = createMockAgent({ name: 'Chat Agent', type: 'chat' });
      const fs = require('fs');

      // Create only agent file (no app file)
      fs.writeFileSync('/project/agent-chat-agent.json', JSON.stringify(agent, null, 2));

      // Verify agent file exists
      expect(fs.existsSync('/project/agent-chat-agent.json')).toBe(true);

      // Delete the agent (should not throw)
      expect(() => deleteAgent('/project', 'Chat Agent')).not.toThrow();

      // Verify agent file is deleted
      expect(fs.existsSync('/project/agent-chat-agent.json')).toBe(false);

      cleanup();
    });

    it('should handle deletion when app file does not exist', () => {
      const { cleanup } = setupMockFS({});

      const agent = createMockAgent({ name: 'Test Agent', type: 'app' });
      const fs = require('fs');

      // Create only agent file (no app file)
      fs.writeFileSync('/project/agent-test-agent.json', JSON.stringify(agent, null, 2));

      // Verify agent file exists
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(true);

      // Delete the agent (should not throw even though app file is missing)
      expect(() => deleteAgent('/project', 'Test Agent')).not.toThrow();

      // Verify agent file is deleted
      expect(fs.existsSync('/project/agent-test-agent.json')).toBe(false);

      cleanup();
    });

    it('should handle agent names with special characters', () => {
      const { cleanup } = setupMockFS({});

      const agent = createMockAgent({ name: 'My Test Agent!', type: 'app' });
      const app = createMockApp({ agentName: 'My Test Agent!' });
      const fs = require('fs');

      // Create agent and app files with sanitized names
      fs.writeFileSync('/project/agent-my-test-agent.json', JSON.stringify(agent, null, 2));
      fs.writeFileSync('/project/app-my-test-agent.json', JSON.stringify(app, null, 2));

      // Verify both files exist
      expect(fs.existsSync('/project/agent-my-test-agent.json')).toBe(true);
      expect(fs.existsSync('/project/app-my-test-agent.json')).toBe(true);

      // Delete the agent
      deleteAgent('/project', 'My Test Agent!');

      // Verify both files are deleted
      expect(fs.existsSync('/project/agent-my-test-agent.json')).toBe(false);
      expect(fs.existsSync('/project/app-my-test-agent.json')).toBe(false);

      cleanup();
    });
  });
});
