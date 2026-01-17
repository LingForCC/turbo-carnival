import { jest } from '@jest/globals';
import {
  sanitizeAgentName,
  getAgentFilePath,
  loadAgents,
  saveAgent,
  deleteAgent,
} from '../../main/agent-management';
import { createMockAgent, createTestProjectStructure } from '../helpers/mocks';
import { setupMockFS } from '../helpers/file-system';
import type { Agent } from '../../global.d';

describe('Agent Management - Integration Tests', () => {
  // Reset mock file system before each test
  beforeEach(() => {
    const { cleanup } = setupMockFS({});
    // Don't call cleanup yet as tests will set up their own mocks
  });

  // Restore all mocks after all tests complete
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Helper Functions', () => {
    describe('sanitizeAgentName', () => {
      it('should convert agent name to filename-safe format', () => {
        expect(sanitizeAgentName('My Agent')).toBe('my-agent');
        expect(sanitizeAgentName('Test@#$% Agent')).toBe('test-agent');
        expect(sanitizeAgentName('  Multiple   Spaces  ')).toBe('-multiple-spaces-');
        expect(sanitizeAgentName('Agent---123')).toBe('agent-123');
      });

      it('should handle edge cases', () => {
        expect(sanitizeAgentName('')).toBe('');
        expect(sanitizeAgentName('123')).toBe('123');
        expect(sanitizeAgentName('---')).toBe('-');
      });

      it('should handle special characters correctly', () => {
        expect(sanitizeAgentName('Agent & Co')).toBe('agent-co');
        expect(sanitizeAgentName('Agent/Controller')).toBe('agentcontroller');
        expect(sanitizeAgentName('Agent: Manager')).toBe('agent-manager');
      });
    });

    describe('getAgentFilePath', () => {
      it('should return correct agent file path', () => {
        const projectPath = '/mock/project';
        const agentName = 'Test Agent';

        const filePath = getAgentFilePath(projectPath, agentName);
        expect(filePath).toBe('/mock/project/agent-test-agent.json');
      });

      it('should handle agent names with spaces', () => {
        const filePath = getAgentFilePath('/mock/project', 'My Great Agent');
        expect(filePath).toBe('/mock/project/agent-my-great-agent.json');
      });
    });
  });

  describe('Storage Operations', () => {
    describe('saveAgent', () => {
      it('should save agent to file', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        const { cleanup } = setupMockFS(mockFiles);

        const agent = createMockAgent({
          name: 'Test Agent',
          type: 'chat',
          description: 'Test description',
        });

        saveAgent('/mock/project', agent);

        // Verify file was created
        const agentPath = '/mock/project/agent-test-agent.json';
        expect(mockFiles[agentPath]).toBeDefined();

        const savedAgent = JSON.parse(mockFiles[agentPath]);
        expect(savedAgent.name).toBe('Test Agent');
        expect(savedAgent.type).toBe('chat');
        expect(savedAgent.description).toBe('Test description');

        cleanup();
      });

      it('should save agent with all properties', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        const { cleanup } = setupMockFS(mockFiles);

        const agent: Agent = {
          name: 'Complete Agent',
          type: 'code',
          description: 'A complete agent',
          config: {
            model: 'gpt-4',
            temperature: 0.8,
            maxTokens: 4000,
            topP: 0.9,
          },
          prompts: {
            system: 'System prompt',
            user: 'User prompt',
          },
          history: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: Date.now(),
            },
          ],
          settings: {
            customSetting: 'value',
          },
        };

        saveAgent('/mock/project', agent);

        const agentPath = '/mock/project/agent-complete-agent.json';
        const savedAgent = JSON.parse(mockFiles[agentPath]);

        expect(savedAgent.name).toBe('Complete Agent');
        expect(savedAgent.config.model).toBe('gpt-4');
        expect(savedAgent.prompts.system).toBe('System prompt');
        expect(savedAgent.history).toHaveLength(1);
        expect(savedAgent.settings.customSetting).toBe('value');

        cleanup();
      });

      it('should throw error when project folder does not exist', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const agent = createMockAgent();

        expect(() => {
          saveAgent('/nonexistent/project', agent);
        }).toThrow('Project folder does not exist');

        cleanup();
      });
    });

    describe('loadAgents', () => {
      it('should load all agents from project folder', () => {
        const agents = [
          createMockAgent({ name: 'Agent 1', type: 'chat' }),
          createMockAgent({ name: 'Agent 2', type: 'code' }),
        ];

        const mockFiles = createTestProjectStructure('/mock/project', agents);
        const { cleanup } = setupMockFS(mockFiles);

        const loadedAgents = loadAgents('/mock/project');

        expect(loadedAgents).toHaveLength(2);
        expect(loadedAgents[0].name).toBe('Agent 1');
        expect(loadedAgents[1].name).toBe('Agent 2');

        cleanup();
      });

      it('should return empty array when project folder does not exist', () => {
        const mockFiles: Record<string, string> = {};
        const { cleanup } = setupMockFS(mockFiles);

        const agents = loadAgents('/nonexistent/project');
        expect(agents).toEqual([]);

        cleanup();
      });

      it('should filter out invalid agent files', () => {
        const mockFiles = createTestProjectStructure('/mock/project', [
          createMockAgent({ name: 'Valid Agent', type: 'chat' }),
        ]);

        // Add invalid agent file
        mockFiles['/mock/project/agent-invalid.json'] = JSON.stringify({
          name: 'Invalid Agent',
          // Missing required fields
        });

        // Add non-agent file
        mockFiles['/mock/project/readme.md'] = 'Readme content';

        const { cleanup } = setupMockFS(mockFiles);

        const agents = loadAgents('/mock/project');

        expect(agents).toHaveLength(1);
        expect(agents[0].name).toBe('Valid Agent');

        cleanup();
      });

      it('should handle corrupted agent files gracefully', () => {
        const mockFiles = createTestProjectStructure('/mock/project', [
          createMockAgent({ name: 'Good Agent', type: 'chat' }),
        ]);

        mockFiles['/mock/project/agent-bad.json'] = 'invalid json{{{';

        const { cleanup } = setupMockFS(mockFiles);

        const agents = loadAgents('/mock/project');

        expect(agents).toHaveLength(1);
        expect(agents[0].name).toBe('Good Agent');

        cleanup();
      });

      it('should sort agents alphabetically by name', () => {
        const agents = [
          createMockAgent({ name: 'Zebra', type: 'chat' }),
          createMockAgent({ name: 'Apple', type: 'chat' }),
          createMockAgent({ name: 'Banana', type: 'chat' }),
        ];

        const mockFiles = createTestProjectStructure('/mock/project', agents);
        const { cleanup } = setupMockFS(mockFiles);

        const loadedAgents = loadAgents('/mock/project');

        expect(loadedAgents[0].name).toBe('Apple');
        expect(loadedAgents[1].name).toBe('Banana');
        expect(loadedAgents[2].name).toBe('Zebra');

        cleanup();
      });

      it('should load agents with special characters in names', () => {
        const agents = [
          createMockAgent({ name: 'Agent & Co', type: 'chat' }),
          createMockAgent({ name: 'Agent 123', type: 'code' }),
        ];

        const mockFiles = createTestProjectStructure('/mock/project', agents);
        const { cleanup } = setupMockFS(mockFiles);

        const loadedAgents = loadAgents('/mock/project');

        expect(loadedAgents).toHaveLength(2);
        expect(loadedAgents[0].name).toBe('Agent & Co');
        expect(loadedAgents[1].name).toBe('Agent 123');

        cleanup();
      });
    });

    describe('deleteAgent', () => {
      it('should delete agent file', () => {
        const agents = [
          createMockAgent({ name: 'Agent 1', type: 'chat' }),
        ];

        const mockFiles = createTestProjectStructure('/mock/project', agents);
        const { cleanup } = setupMockFS(mockFiles);

        const agentPath = '/mock/project/agent-agent-1.json';
        expect(mockFiles[agentPath]).toBeDefined();

        deleteAgent('/mock/project', 'Agent 1');

        expect(mockFiles[agentPath]).toBeUndefined();

        cleanup();
      });

      it('should not throw error when agent file does not exist', () => {
        const mockFiles = createTestProjectStructure('/mock/project', []);
        const { cleanup } = setupMockFS(mockFiles);

        expect(() => {
          deleteAgent('/mock/project', 'Nonexistent Agent');
        }).not.toThrow();

        cleanup();
      });

      it('should delete agent with special characters in name', () => {
        const agents = [
          createMockAgent({ name: 'Agent & Co', type: 'chat' }),
        ];

        const mockFiles = createTestProjectStructure('/mock/project', agents);
        const { cleanup } = setupMockFS(mockFiles);

        const agentPath = '/mock/project/agent-agent-co.json';
        expect(mockFiles[agentPath]).toBeDefined();

        deleteAgent('/mock/project', 'Agent & Co');

        expect(mockFiles[agentPath]).toBeUndefined();

        cleanup();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete agent lifecycle', () => {
      const mockFiles = createTestProjectStructure('/mock/project', []);
      const { cleanup } = setupMockFS(mockFiles);

      // Create agent
      const agent = createMockAgent({
        name: 'Lifecycle Agent',
        type: 'chat',
        description: 'Testing agent lifecycle',
      });

      saveAgent('/mock/project', agent);

      // Load agent
      const loadedAgents = loadAgents('/mock/project');
      expect(loadedAgents).toHaveLength(1);
      expect(loadedAgents[0].name).toBe('Lifecycle Agent');

      // Update agent (save with same name)
      const updatedAgent = {
        ...agent,
        description: 'Updated description',
      };
      saveAgent('/mock/project', updatedAgent);

      const reloadedAgents = loadAgents('/mock/project');
      expect(reloadedAgents[0].description).toBe('Updated description');

      // Delete agent
      deleteAgent('/mock/project', 'Lifecycle Agent');

      const finalAgents = loadAgents('/mock/project');
      expect(finalAgents).toHaveLength(0);

      cleanup();
    });

    it('should handle multiple agents in same project', () => {
      const agents = [
        createMockAgent({ name: 'Agent A', type: 'chat' }),
        createMockAgent({ name: 'Agent B', type: 'code' }),
        createMockAgent({ name: 'Agent C', type: 'assistant' }),
      ];

      const mockFiles = createTestProjectStructure('/mock/project', agents);
      const { cleanup } = setupMockFS(mockFiles);

      const loadedAgents = loadAgents('/mock/project');
      expect(loadedAgents).toHaveLength(3);

      // Delete one agent
      deleteAgent('/mock/project', 'Agent B');

      const remainingAgents = loadAgents('/mock/project');
      expect(remainingAgents).toHaveLength(2);
      expect(remainingAgents.map((a: Agent) => a.name)).toEqual(['Agent A', 'Agent C']);

      cleanup();
    });

    it('should handle agent name sanitization consistently', () => {
      const mockFiles = createTestProjectStructure('/mock/project', []);
      const { cleanup } = setupMockFS(mockFiles);

      const agent = createMockAgent({
        name: 'Test Agent @#$',
        type: 'chat',
      });

      saveAgent('/mock/project', agent);

      // File should be created with sanitized name
      expect(mockFiles['/mock/project/agent-test-agent.json']).toBeDefined();

      // Load should find it
      const loadedAgents = loadAgents('/mock/project');
      expect(loadedAgents).toHaveLength(1);
      expect(loadedAgents[0].name).toBe('Test Agent @#$');

      cleanup();
    });
  });
});
