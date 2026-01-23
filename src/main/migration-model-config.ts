import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import { loadProjects } from './project-management';
import { loadAgents, saveAgent, getAgentFilePath } from './agent-management';
import { loadModelConfigs, saveModelConfigs } from './model-config-management';
import type { ModelConfig, Agent } from '../global.d.ts';

/**
 * Generate a config signature for deduplication
 * Creates a hash from model, temperature, maxTokens, and topP
 */
function generateConfigSignature(agent: Agent): string {
  const config = agent.config;
  const data = {
    model: config.model || 'claude-3.5',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    topP: config.topP,
  };

  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Generate a ModelConfig ID from model name and a random suffix
 */
function generateModelConfigId(model: string): string {
  const sanitizedModel = model
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${sanitizedModel}-${randomSuffix}`;
}

/**
 * Create a ModelConfig from an Agent's config
 */
function createModelConfigFromAgent(agent: Agent, id: string): ModelConfig {
  const config = agent.config;

  return {
    id,
    name: `${config.model || 'claude-3.5'} - ${config.temperature ?? 0.7}`,
    model: config.model || 'claude-3.5',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    topP: config.topP,
    createdAt: Date.now(),
  };
}

/**
 * Migrate agent configurations to ModelConfig system
 * Scans all projects and agents, creating ModelConfig entries from inline configs
 */
export function migrateAgentConfigsToModelConfigs(): {
  success: boolean;
  migrated: number;
  errors: string[];
} {
  const result = {
    success: true,
    migrated: 0,
    errors: [] as string[]
  };

  try {
    // Check if migration already done
    const modelConfigsPath = path.join(app.getPath('userData'), 'model-configs.json');
    if (fs.existsSync(modelConfigsPath)) {
      console.log('Model configs file already exists, skipping migration');
      return result;
    }

    // Load all projects
    const projects = loadProjects();
    if (projects.length === 0) {
      console.log('No projects found, nothing to migrate');
      return result;
    }

    // Map to track unique configs (signature -> ModelConfig)
    const configsMap = new Map<string, ModelConfig>();
    const modelConfigs: ModelConfig[] = [];

    // Process each project
    for (const project of projects) {
      try {
        const agents = loadAgents(project.path);

        for (const agent of agents) {
          // Skip if already migrated
          if (agent.config.modelId) {
            continue;
          }

          // Skip if agent has no model config at all
          if (!agent.config.model && !agent.config.temperature && !agent.config.maxTokens && !agent.config.topP) {
            // Use defaults for agents with no config
            agent.config.model = 'claude-3.5';
            agent.config.temperature = 0.7;
          }

          // Generate config signature for deduplication
          const signature = generateConfigSignature(agent);

          // Get or create ModelConfig
          let modelConfig = configsMap.get(signature);
          if (!modelConfig) {
            const modelConfigId = generateModelConfigId(agent.config.model || 'claude-3.5');
            modelConfig = createModelConfigFromAgent(agent, modelConfigId);
            configsMap.set(signature, modelConfig);
            modelConfigs.push(modelConfig);
          }

          // Update agent with modelId reference
          agent.config.modelId = modelConfig.id;

          // Save agent file
          saveAgent(project.path, agent);
          result.migrated++;
        }
      } catch (error: any) {
        const errorMsg = `Failed to migrate agents in project ${project.name}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Save all ModelConfigs
    if (modelConfigs.length > 0) {
      saveModelConfigs(modelConfigs);
      console.log(`Successfully created ${modelConfigs.length} model configurations`);
    }

    console.log(`Successfully migrated ${result.migrated} agents to use ModelConfig`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    console.error('Migration failed:', error);
  }

  return result;
}
