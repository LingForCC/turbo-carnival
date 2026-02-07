/**
 * Agent Template Type Definitions
 * Contains all types and interfaces related to agent template management
 */

/**
 * Agent Template configuration
 * A reusable template for creating agents with pre-configured settings
 */
export interface AgentTemplate {
  id: string;                    // Unique identifier (e.g., "code-reviewer")
  name: string;                  // Display name (e.g., "Code Review Assistant")
  type: string;                  // Agent type: "chat", "code", "assistant", "reviewer", "app", "custom"
  description: string;           // Description of what this template creates
  config: {
    modelId?: string;            // Optional model configuration ID reference
    providerId?: string;         // Optional provider ID reference
  };
  prompts: {
    system?: string;             // Optional system prompt
    user?: string;               // Optional default user prompt
  };
  createdAt: number;             // Timestamp when created
  updatedAt?: number;            // Timestamp when last updated
}

/**
 * Agent Template Management API interface
 * Defines the contract for agent template operations
 * Used by renderer components to interact with agent template functionality
 */
export interface AgentTemplateManagementAPI {
  /**
   * Get all agent templates
   * @returns Promise resolving to array of templates
   */
  getTemplates(): Promise<AgentTemplate[]>;

  /**
   * Add a new template
   * @param template - Template configuration to add
   * @returns Promise resolving when added
   */
  addTemplate(template: AgentTemplate): Promise<void>;

  /**
   * Update an existing template
   * @param id - Template ID to update
   * @param template - Updated template configuration
   * @returns Promise resolving when updated
   */
  updateTemplate(id: string, template: AgentTemplate): Promise<void>;

  /**
   * Remove a template
   * @param id - Template ID to remove
   * @returns Promise resolving when removed
   */
  removeTemplate(id: string): Promise<void>;

  /**
   * Get template by ID
   * @param id - Template ID
   * @returns Promise resolving to template or null if not found
   */
  getTemplateById(id: string): Promise<AgentTemplate | null>;
}
