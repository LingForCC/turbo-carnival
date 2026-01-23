import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { loadAPIKeys, getAPIKeysPath } from './apiKey-management';
import { loadProviders, saveProviders } from './provider-management';
import type { LLMProvider, APIKey } from '../global.d.ts';

/**
 * Migrate existing API keys to provider format
 * Creates OpenAI providers from existing API keys
 */
export function migrateAPIKeysToProviders(): {
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
    const providersPath = path.join(app.getPath('userData'), 'providers.json');
    if (fs.existsSync(providersPath)) {
      console.log('Providers file already exists, skipping migration');
      return result;
    }

    // Load existing API keys
    const apiKeysPath = getAPIKeysPath();
    if (!fs.existsSync(apiKeysPath)) {
      console.log('No API keys file found, nothing to migrate');
      return result;
    }

    const apiKeys = loadAPIKeys();
    if (apiKeys.length === 0) {
      console.log('No API keys to migrate');
      return result;
    }

    // Convert API keys to providers
    const providers: LLMProvider[] = apiKeys.map((apiKey) => {
      // Generate provider ID from key name (sanitize)
      const providerId = apiKey.name
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return {
        id: providerId || `migrated-provider-${Date.now()}`,
        type: 'openai', // Default to OpenAI for migrated keys
        name: apiKey.name,
        apiKey: apiKey.apiKey,
        baseURL: apiKey.baseURL,
        createdAt: apiKey.createdAt
      };
    });

    // Save providers
    saveProviders(providers);
    result.migrated = providers.length;

    // Backup old API keys file
    const backupPath = apiKeysPath + '.backup';
    fs.copyFileSync(apiKeysPath, backupPath);
    console.log(`API keys backed up to: ${backupPath}`);

    console.log(`Successfully migrated ${providers.length} API keys to providers`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    console.error('Migration failed:', error);
  }

  return result;
}

/**
 * Migrate agent configurations from apiKeyRef to providerId
 * Updates agent files to use new provider system
 *
 * NOTE: This function would need to be called for each project
 * Currently not called automatically to avoid disrupting user workflows
 */
export function migrateAgentConfigs(projectPath: string): {
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
    const { loadAgents, saveAgent } = require('./agent-management');
    const agents = loadAgents(projectPath);

    for (const agent of agents) {
      if (agent.config.apiConfig?.apiKeyRef) {
        // Map apiKeyRef to providerId
        const providerId = agent.config.apiConfig.apiKeyRef
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        // Update agent config
        agent.config.providerId = providerId;
        delete agent.config.apiConfig; // Remove old apiConfig

        saveAgent(projectPath, agent);
        result.migrated++;
      }
    }

    console.log(`Migrated ${result.migrated} agents in project: ${projectPath}`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    console.error(`Agent migration failed for project ${projectPath}:`, error);
  }

  return result;
}
