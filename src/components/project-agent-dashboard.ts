import type { Project, Agent, ModelConfig } from '../global.d.ts';

/**
 * ProjectAgentDashboard Web Component
 * Displays agents for the selected project with add/edit functionality
 */
export class ProjectAgentDashboard extends HTMLElement {
  private currentProject: Project | null = null;
  private agents: Agent[] = [];
  private selectedAgent: Agent | null = null;
  private modelConfigs: ModelConfig[] = [];

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();

    // Listen for project selection events
    this.addEventListener('project-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.handleProjectSelected(customEvent.detail.project);
    });
  }

  private render(): void {
    this.innerHTML = `
      <div class="flex-1 bg-white h-full flex flex-col">
        <!-- Header -->
        <div class="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-gray-800 m-0">
              ${this.currentProject ? this.escapeHtml(this.currentProject.name) : 'No Project Selected'}
            </h2>
            ${this.currentProject ?
              `<p class="text-xs text-gray-500 m-0 mt-0.5">${this.agents.length} agents</p>` :
              ''
            }
          </div>

          ${this.currentProject ? `
            <button id="add-agent-btn" class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors cursor-pointer border-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add Agent
            </button>
          ` : ''}
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-6">
          ${this.renderContent()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderContent(): string {
    // No project selected
    if (!this.currentProject) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-600 mb-2">No Project Selected</h3>
          <p class="text-sm text-gray-400 max-w-md m-0">
            Select a project from the left sidebar to view and manage its agents.
          </p>
        </div>
      `;
    }

    // Project selected but no agents
    if (this.agents.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-600 mb-2">No Agents Yet</h3>
          <p class="text-sm text-gray-400 max-w-md mb-4 m-0">
            Create your first AI agent for this project to get started.
          </p>
          <button class="add-agent-empty-btn flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors cursor-pointer border-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create Agent
          </button>
        </div>
      `;
    }

    // Render agents list
    return `
      <div class="space-y-2">
        ${this.agents.map(agent => this.renderAgentCard(agent)).join('')}
      </div>
    `;
  }

  private renderAgentCard(agent: Agent): string {
    const isSelected = this.selectedAgent?.name === agent.name;

    return `
      <div class="agent-card group flex items-center gap-4 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer transition-all
                     ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-50 hover:border-gray-300'}"
           data-agent-name="${this.escapeHtml(agent.name)}">

        <!-- Agent Icon -->
        <div class="shrink-0">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
        </div>

        <!-- Agent Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-800 truncate m-0">
              ${this.escapeHtml(agent.name)}
            </h3>
            <span class="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded shrink-0">
              ${this.escapeHtml(agent.type)}
            </span>
          </div>
          <p class="text-xs text-gray-500 m-0 mt-0.5 truncate">
            ${this.escapeHtml(agent.description)}
          </p>
        </div>

        <!-- Agent Config -->
        <div class="shrink-0 text-xs text-gray-400">
          ${this.getModelDisplayName(agent)}
        </div>

        <!-- Actions Menu -->
        <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="edit-agent-btn p-1.5 hover:bg-gray-200 rounded cursor-pointer border-0 bg-transparent"
                  data-agent-name="${this.escapeHtml(agent.name)}" title="Edit agent">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-agent-btn p-1.5 hover:bg-red-100 rounded cursor-pointer border-0 bg-transparent"
                  data-agent-name="${this.escapeHtml(agent.name)}" title="Delete agent">
            <svg class="w-4 h-4 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Add agent button (header)
    const addAgentBtn = this.querySelector('#add-agent-btn');
    if (addAgentBtn) {
      const newBtn = addAgentBtn.cloneNode(true);
      addAgentBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openAgentForm());
    }

    // Add agent button (empty state)
    const addAgentEmptyBtn = this.querySelector('.add-agent-empty-btn');
    if (addAgentEmptyBtn) {
      const newBtn = addAgentEmptyBtn.cloneNode(true);
      addAgentEmptyBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.openAgentForm());
    }

    // Agent cards
    this.querySelectorAll('.agent-card').forEach(card => {
      const agentName = card.getAttribute('data-agent-name');
      const agent = this.agents.find(a => a.name === agentName);
      if (!agent) return;

      // Click to select
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.edit-agent-btn') ||
            (e.target as HTMLElement).closest('.delete-agent-btn')) {
          return;
        }
        this.selectAgent(agent);
      });

      // Edit button
      const editBtn = card.querySelector('.edit-agent-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openAgentForm(agent);
        });
      }

      // Delete button
      const deleteBtn = card.querySelector('.delete-agent-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteAgent(agent);
        });
      }
    });
  }

  /**
   * Handle project selection
   */
  private async handleProjectSelected(project: Project): Promise<void> {
    this.currentProject = project;
    await this.loadAgents();
    await this.loadModelConfigs();
    this.render();
  }

  /**
   * Load agents for current project
   */
  private async loadAgents(): Promise<void> {
    if (!this.currentProject || !window.electronAPI) {
      this.agents = [];
      return;
    }

    try {
      this.agents = await window.electronAPI.getAgents(this.currentProject.path);
    } catch (error) {
      console.error('Failed to load agents:', error);
      this.agents = [];
    }
  }

  /**
   * Load all model configs
   */
  private async loadModelConfigs(): Promise<void> {
    if (!window.electronAPI) {
      this.modelConfigs = [];
      return;
    }

    try {
      this.modelConfigs = await window.electronAPI.getModelConfigs();
    } catch (error) {
      console.error('Failed to load model configs:', error);
      this.modelConfigs = [];
    }
  }

  /**
   * Select an agent and emit event
   */
  private selectAgent(agent: Agent): void {
    this.selectedAgent = agent;
    this.render(); // Re-render to show selection

    // Emit event for right panel or other components
    this.dispatchEvent(new CustomEvent('agent-selected', {
      detail: { agent, project: this.currentProject },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Open agent form dialog (create or edit)
   */
  private openAgentForm(agent?: Agent): void {
    // Create and show the dialog
    const dialog = document.createElement('agent-form-dialog');

    if (agent) {
      dialog.setAttribute('mode', 'edit');
      dialog.dataset.agent = JSON.stringify(agent);
    } else {
      dialog.setAttribute('mode', 'create');
    }

    document.body.appendChild(dialog);

    // Listen for form submission
    dialog.addEventListener('agent-form-submit', async (event: Event) => {
      const customEvent = event as CustomEvent;
      const agentData = customEvent.detail.agent as Agent;

      try {
        if (agent) {
          // Update existing agent
          await window.electronAPI?.updateAgent(
            this.currentProject!.path,
            agent.name,
            agentData
          );
        } else {
          // Create new agent
          await window.electronAPI?.addAgent(
            this.currentProject!.path,
            agentData
          );
        }

        // Reload agents and model configs
        await this.loadAgents();
        await this.loadModelConfigs();
        this.render();
      } catch (error: any) {
        console.error('Failed to save agent:', error);
        alert(`Failed to save agent: ${error.message}`);
      }

      // Remove dialog on successful save
      dialog.remove();
    });

    // Listen for dialog cancellation
    // Dialog removes itself on cancel
    dialog.addEventListener('agent-form-cancel', () => {
      // Dialog handles its own removal
    });
  }

  /**
   * Delete an agent with confirmation
   */
  private async deleteAgent(agent: Agent): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete the agent "${agent.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await window.electronAPI?.removeAgent(this.currentProject!.path, agent.name);

      // Clear selection if deleted agent was selected
      if (this.selectedAgent?.name === agent.name) {
        this.selectedAgent = null;
      }

      await this.loadAgents();
      this.render();
    } catch (error: any) {
      console.error('Failed to delete agent:', error);
      alert(`Failed to delete agent: ${error.message}`);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get model display name for an agent
   * Handles both new modelId system and legacy model field
   */
  private getModelDisplayName(agent: Agent): string {
    // Try to get model config if modelId is set
    if (agent.config.modelId) {
      const modelConfig = this.modelConfigs.find(m => m.id === agent.config.modelId);
      if (modelConfig) {
        return modelConfig.model;
      }
    }

    // Fall back to deprecated model field
    return agent.config.model || 'N/A';
  }

  /**
   * Public method to get current project
   */
  public getCurrentProject(): Project | null {
    return this.currentProject;
  }

  /**
   * Public method to get selected agent
   */
  public getSelectedAgent(): Agent | null {
    return this.selectedAgent;
  }
}

// Register the custom element
customElements.define('project-agent-dashboard', ProjectAgentDashboard);
