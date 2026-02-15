import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { AgentTemplate } from '../types';

// ============ AGENT TEMPLATE STORAGE HELPERS ============

/**
 * Get the file path for agent templates storage
 */
export function getTemplatesPath(): string {
  return path.join(app.getPath('userData'), 'agent-templates.json');
}

/**
 * Load all agent templates from storage
 */
export function loadTemplates(): AgentTemplate[] {
  const templatesPath = getTemplatesPath();
  if (fs.existsSync(templatesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
      return data.templates || [];
    } catch (error) {
      console.error('Failed to load agent templates:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save agent templates to storage
 */
export function saveTemplates(templates: AgentTemplate[]): void {
  const templatesPath = getTemplatesPath();
  const data = { templates };
  try {
    fs.writeFileSync(templatesPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save agent templates:', error);
  }
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): AgentTemplate | undefined {
  const templates = loadTemplates();
  return templates.find(t => t.id === id);
}

/**
 * Validate agent template configuration
 */
export function validateTemplate(template: AgentTemplate): { valid: boolean; error?: string } {
  // Validate ID
  if (!template.id || !/^[a-zA-Z0-9-_]+$/.test(template.id)) {
    return { valid: false, error: 'Template ID must contain only letters, numbers, hyphens, and underscores' };
  }

  // Validate name
  if (!template.name || template.name.trim().length === 0) {
    return { valid: false, error: 'Template name is required' };
  }

  // Validate type
  if (!template.type || template.type.trim().length === 0) {
    return { valid: false, error: 'Agent type is required' };
  }

  const validTypes = ['chat', 'code', 'assistant', 'reviewer', 'app', 'custom'];
  if (!validTypes.includes(template.type)) {
    return { valid: false, error: `Invalid agent type. Must be one of: ${validTypes.join(', ')}` };
  }

  // Validate description
  if (!template.description || template.description.trim().length === 0) {
    return { valid: false, error: 'Description is required' };
  }

  // Validate config object exists
  if (!template.config) {
    return { valid: false, error: 'Config object is required' };
  }

  // Validate prompts object exists
  if (!template.prompts) {
    return { valid: false, error: 'Prompts object is required' };
  }

  return { valid: true };
}

// ============ AGENT TEMPLATE IPC HANDLERS ============

/**
 * Register all Agent Template-related IPC handlers
 */
export function registerAgentTemplateIPCHandlers(): void {
  // Handler: Get all templates
  ipcMain.handle('agent-templates:get', () => {
    return loadTemplates();
  });

  // Handler: Add a new template
  ipcMain.handle('agent-templates:add', async (_event, template: AgentTemplate) => {
    const templates = loadTemplates();

    // Check for duplicate IDs
    if (templates.some(t => t.id === template.id)) {
      throw new Error(`Template with ID "${template.id}" already exists`);
    }

    // Validate template
    const validation = validateTemplate(template);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Add timestamp
    template.createdAt = Date.now();

    templates.push(template);
    saveTemplates(templates);
  });

  // Handler: Update an existing template
  ipcMain.handle('agent-templates:update', async (_event, id: string, template: AgentTemplate) => {
    const templates = loadTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error(`Template with ID "${id}" not found`);
    }

    // Validate template
    const validation = validateTemplate(template);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Preserve createdAt, update updatedAt
    template.createdAt = templates[index].createdAt;
    template.updatedAt = Date.now();

    templates[index] = template;
    saveTemplates(templates);
  });

  // Handler: Remove a template
  ipcMain.handle('agent-templates:remove', async (_event, id: string) => {
    const templates = loadTemplates();
    const filtered = templates.filter(t => t.id !== id);
    saveTemplates(filtered);
  });

  // Handler: Get template by ID
  ipcMain.handle('agent-templates:getById', async (_event, id: string) => {
    const template = getTemplateById(id);
    if (!template) {
      return null;
    }
    return template;
  });
}
