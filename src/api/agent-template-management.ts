import type { AgentTemplateManagementAPI, AgentTemplate } from '../types/agent-template';

/**
 * Agent Template Management API for Renderer Components
 * This module uses window.electronAPI and is safe to import in renderer processes
 */

/**
 * Get electronAPI or throw error if not available
 */
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available');
  }
  return window.electronAPI;
}

/**
 * Agent Template Management API implementation for renderer components
 */
const apiInstance: AgentTemplateManagementAPI = {
  /**
   * Get all agent templates
   */
  getTemplates: () => {
    return getElectronAPI().getTemplates();
  },

  /**
   * Add a new template
   */
  addTemplate: (template: AgentTemplate) => {
    return getElectronAPI().addTemplate(template);
  },

  /**
   * Update an existing template
   */
  updateTemplate: (id: string, template: AgentTemplate) => {
    return getElectronAPI().updateTemplate(id, template);
  },

  /**
   * Remove a template
   */
  removeTemplate: (id: string) => {
    return getElectronAPI().removeTemplate(id);
  },

  /**
   * Get template by ID
   */
  getTemplateById: (id: string) => {
    return getElectronAPI().getTemplateById(id);
  },
};

/**
 * Get the AgentTemplateManagementAPI instance
 * Returns a singleton instance that implements AgentTemplateManagementAPI interface
 */
export function getAgentTemplateManagementAPI(): AgentTemplateManagementAPI {
  return apiInstance;
}

// Also export the instance directly for backward compatibility
export const agentTemplateManagementAPI = apiInstance;
