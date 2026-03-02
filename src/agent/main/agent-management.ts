import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Agent } from '../types';

// ============ AGENT STORAGE HELPERS ============

/**
 * Sanitize agent name for use as filename
 * Converts spaces to hyphens, removes special chars
 */
export function sanitizeAgentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .trim();
}

/**
 * Get the file path for an agent's JSON file
 */
export function getAgentFilePath(projectPath: string, agentName: string): string {
  const sanitizedName = sanitizeAgentName(agentName);
  return path.join(projectPath, `agent-${sanitizedName}.json`);
}

/**
 * Load all agents from a project folder
 */
export function loadAgents(projectPath: string): Agent[] {
  // Verify project folder exists
  if (!fs.existsSync(projectPath)) {
    console.warn(`Project folder does not exist: ${projectPath}`);
    return [];
  }

  const agents: Agent[] = [];

  try {
    // Read all files in project folder
    const files = fs.readdirSync(projectPath);

    // Filter for agent files (agent-*.json)
    const agentFiles = files.filter(file =>
      file.startsWith('agent-') && file.endsWith('.json')
    );

    // Load each agent file
    for (const file of agentFiles) {
      const filePath = path.join(projectPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const agent = JSON.parse(content) as Agent;

        // Validate agent has required fields
        if (agent.name && agent.type && agent.description) {
          agents.push(agent);
        } else {
          console.warn(`Invalid agent file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to load agent file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to read project folder ${projectPath}:`, error);
  }

  // Sort agents by updatedAt (latest first), then by name as fallback
  return agents.sort((a, b) => {
    // If both have updatedAt, sort by date descending
    if (a.updatedAt && b.updatedAt) {
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    // If only one has updatedAt, prioritize it
    if (a.updatedAt) return -1;
    if (b.updatedAt) return 1;
    // Fallback to name sorting
    return a.name.localeCompare(b.name);
  });
}

/**
 * Save an agent to a file in the project folder
 * Automatically updates the updatedAt timestamp
 */
export function saveAgent(projectPath: string, agent: Agent): void {
  // Verify project folder exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project folder does not exist: ${projectPath}`);
  }

  // Update timestamp
  agent.updatedAt = new Date().toISOString();

  const filePath = getAgentFilePath(projectPath, agent.name);

  try {
    fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save agent to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete an agent file
 */
export function deleteAgent(projectPath: string, agentName: string): void {
  const filePath = getAgentFilePath(projectPath, agentName);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete agent file ${filePath}:`, error);
      throw error;
    }
  }
}

/**
 * Archive agent conversation history to a separate file
 * Creates a duplicate of the agent file with timestamp in the name,
 * then clears the history in the current agent
 */
export function archiveAgentHistory(projectPath: string, agentName: string): { archivedFileName: string } {
  // Verify project folder exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project folder does not exist: ${projectPath}`);
  }

  const filePath = getAgentFilePath(projectPath, agentName);

  // Check if agent file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Agent file not found: ${filePath}`);
  }

  // Read the current agent data
  let agent: Agent;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    agent = JSON.parse(content) as Agent;
  } catch (error) {
    console.error(`Failed to read agent file ${filePath}:`, error);
    throw error;
  }

  // Check if there's any history to archive
  if (!agent.history || agent.history.length === 0) {
    throw new Error('No conversation history to archive');
  }

  // Generate timestamp for archive filename (e.g., 2026-03-02T10-30-45)
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')  // Replace colons with hyphens for filename compatibility
    .replace(/\.\d{3}Z$/, '');  // Remove milliseconds and Z suffix

  // Create archived filename
  const sanitizedName = sanitizeAgentName(agentName);
  const archivedFileName = `agent-${sanitizedName}-archived-${timestamp}.json`;
  const archivedFilePath = path.join(projectPath, archivedFileName);

  // Save the archived copy (with original history)
  try {
    const archivedAgent = {
      ...agent,
      name: `${agent.name} (Archived ${timestamp.replace('T', ' ')})`,
      updatedAt: now.toISOString()
    };
    fs.writeFileSync(archivedFilePath, JSON.stringify(archivedAgent, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to create archived agent file ${archivedFilePath}:`, error);
    throw error;
  }

  // Clear history in the current agent and save
  try {
    agent.history = [];
    agent.updatedAt = now.toISOString();
    fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to update agent file ${filePath}:`, error);
    // Try to clean up the archived file if we failed to update the original
    try {
      fs.unlinkSync(archivedFilePath);
    } catch (cleanupError) {
      console.error(`Failed to clean up archived file:`, cleanupError);
    }
    throw error;
  }

  return { archivedFileName };
}

// ============ AGENT IPC HANDLERS ============

/**
 * Register all agent-related IPC handlers
 */
export function registerAgentIPCHandlers(): void {
  // Handler: Get all agents for a project
  ipcMain.handle('agents:get', async (_event, projectPath: string) => {
    return loadAgents(projectPath);
  });

  // Handler: Add a new agent to a project
  ipcMain.handle('agents:add', async (_event, projectPath: string, agent: Agent) => {
    // Validate agent data
    if (!agent.name || !agent.type || !agent.description) {
      throw new Error('Agent must have name, type, and description');
    }

    // Check for duplicate agent names in this project
    const existingAgents = loadAgents(projectPath);
    if (existingAgents.some(a => a.name === agent.name)) {
      throw new Error(`Agent with name "${agent.name}" already exists in this project`);
    }

    // Initialize with defaults if not provided
    const newAgent: Agent = {
      name: agent.name,
      type: agent.type,
      description: agent.description,
      config: agent.config || { model: 'claude-3.5', temperature: 0.7 },
      prompts: agent.prompts || {},
      history: agent.history || [],
      settings: agent.settings || {}
    };

    // Save agent file
    saveAgent(projectPath, newAgent);

    // Return updated list
    return loadAgents(projectPath);
  });

  // Handler: Remove an agent from a project
  ipcMain.handle('agents:remove', async (_event, projectPath: string, agentName: string) => {
    deleteAgent(projectPath, agentName);
    return loadAgents(projectPath);
  });

  // Handler: Update an existing agent
  ipcMain.handle('agents:update', async (_event, projectPath: string, agentName: string, updatedAgent: Agent) => {
    // Verify agent exists
    const existingAgents = loadAgents(projectPath);
    const existingAgent = existingAgents.find(a => a.name === agentName);

    if (!existingAgent) {
      throw new Error(`Agent "${agentName}" not found in project`);
    }

    // If name changed, check for conflicts and delete old file
    if (updatedAgent.name !== agentName) {
      if (existingAgents.some(a => a.name === updatedAgent.name)) {
        throw new Error(`Agent with name "${updatedAgent.name}" already exists`);
      }
      deleteAgent(projectPath, agentName);
    }

    // Save updated agent (saveAgent will set updatedAt)
    const savedAgent = { ...updatedAgent };
    saveAgent(projectPath, savedAgent);
    return savedAgent;
  });

  // Handler: Archive agent conversation history
  ipcMain.handle('agents:archive-history', async (_event, projectPath: string, agentName: string) => {
    return archiveAgentHistory(projectPath, agentName);
  });
}
