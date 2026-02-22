import { getSettingsManagementAPI } from '../api';
import { getProviderManagementAPI } from '../../llm/api';
import type { AppSettings } from '../types';
import type { LLMProvider, ModelConfig } from '../../llm/types';
import type { FeatureSettingsRegistration } from '../types';
import './tools-settings-panel';
import './ai-settings-panel';

// Core tabs that are always present
type CoreSettingsTab = 'general' | 'ai' | 'tools';
type SettingsTab = CoreSettingsTab | string; // Core tabs plus dynamic feature tabs

// Core tab definitions with order
const CORE_TABS: Array<{ id: CoreSettingsTab; displayName: string; order: number }> = [
  { id: 'general', displayName: 'General', order: 0 },
  { id: 'ai', displayName: 'AI', order: 10 },
  { id: 'tools', displayName: 'Tools', order: 20 },
];

/**
 * Get registered feature tabs from the main process
 * This will be populated by features that register their settings
 */
async function getFeatureRegistrations(): Promise<FeatureSettingsRegistration[]> {
  try {
    // Get all settings which includes feature defaults
    const api = getSettingsManagementAPI();
    const settings = await api.getSettings();

    // Check for registered features in settings
    // Features register themselves in the main process
    // For now, we'll return an empty array and rely on features
    // to import and register themselves
    return [];
  } catch (error) {
    console.error('Failed to get feature registrations:', error);
    return [];
  }
}

// Module-level storage for feature registrations (set from renderer side)
let featureRegistrations: FeatureSettingsRegistration[] = [];

/**
 * Register feature settings from the renderer side
 * Called by features when their settings panel component is loaded
 */
export function registerFeatureSettingsRenderer(registration: FeatureSettingsRegistration): void {
  // Check if already registered
  if (featureRegistrations.some(r => r.featureId === registration.featureId)) {
    return;
  }
  featureRegistrations.push(registration);
  // Sort by order
  featureRegistrations.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/**
 * Get all registered feature tabs
 */
function getRegisteredFeatureTabs(): FeatureSettingsRegistration[] {
  return featureRegistrations;
}

/**
 * SettingsDialog Web Component
 * Modal dialog for app settings including notepad configuration
 */
export class SettingsDialog extends HTMLElement {
  private settings: AppSettings | null = null;
  private currentTheme: 'light' | 'dark' = 'light';
  private currentTab: SettingsTab;
  private api = getSettingsManagementAPI();
  private providerApi = getProviderManagementAPI();
  private providers: LLMProvider[] = [];
  private modelConfigs: ModelConfig[] = [];

  constructor() {
    super();
    // Check if a specific tab was requested via data attribute
    this.currentTab = (this.dataset.tab as SettingsTab) || 'general';
  }

  async connectedCallback(): Promise<void> {
    await this.loadSettings();
    await this.loadProviders();
    this.render();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await this.api.getSettings();
      this.currentTheme = this.settings.theme === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { theme: 'light', projectFolder: '', notepadSaveLocation: '', snippetSaveLocation: '', clipboardHistorySaveLocation: '' };
      this.currentTheme = 'light';
    }
  }

  private async loadProviders(): Promise<void> {
    try {
      this.providers = await this.providerApi.getProviders();
      this.modelConfigs = await this.providerApi.getModelConfigs();
    } catch (error) {
      console.error('Failed to load providers:', error);
      this.providers = [];
      this.modelConfigs = [];
    }
  }

  private render(): void {
    if (!this.settings) {
      this.innerHTML = '<div>Loading...</div>';
      return;
    }

    // Build combined tab list (core + feature tabs)
    const featureTabs = getRegisteredFeatureTabs();
    const allTabs = [
      ...CORE_TABS.map(t => ({ id: t.id, displayName: t.displayName, order: t.order, isFeature: false })),
      ...featureTabs.map(t => ({ id: t.featureId, displayName: t.displayName, order: t.order ?? 100, isFeature: true, panelTagName: t.panelTagName }))
    ].sort((a, b) => a.order - b.order);

    const projectFolder = this.settings.projectFolder || '';
    const defaultProviderId = this.settings.defaultProviderId || '';
    const defaultModelConfigId = this.settings.defaultModelConfigId || '';

    // Generate tab buttons
    const tabButtonsHtml = allTabs.map(tab => {
      const isActive = this.currentTab === tab.id;
      return `
        <button data-tab="${tab.id}" class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}">
          ${this.escapeHtml(tab.displayName)}
        </button>
      `;
    }).join('');

    this.innerHTML = `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <!-- Dialog - Larger size with fixed dimensions -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[900px] max-w-[95vw] h-[80vh] max-h-[80vh] flex flex-col">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 m-0">App Settings</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
                Configure application preferences
              </p>
            </div>
            <button id="close-btn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer border-0 bg-transparent">
              <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tab Navigation -->
          <div class="px-6 pt-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <nav class="flex gap-1 -mb-px flex-wrap">
              ${tabButtonsHtml}
            </nav>
          </div>

          <!-- Tab Content - Scrollable -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- General Tab -->
            <div id="tab-general" class="tab-content ${this.currentTab === 'general' ? '' : 'hidden'} space-y-6">
              <!-- Project Folder -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="project-folder">
                  Project Folder
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    id="project-folder-input"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                    placeholder="Not configured"
                    value="${this.escapeHtml(projectFolder)}"
                  >
                  <button
                    id="browse-project-folder-btn"
                    class="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer border-0"
                  >
                    Browse...
                  </button>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  All immediate subfolders will appear as projects in the sidebar.
                </p>
              </div>

              <!-- Theme Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      ${this.currentTheme === 'light' ? 'checked' : ''}
                      class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    >
                    <span class="text-sm text-gray-700 dark:text-gray-300">Light</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      ${this.currentTheme === 'dark' ? 'checked' : ''}
                      class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    >
                    <span class="text-sm text-gray-700 dark:text-gray-300">Dark</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose between light and dark appearance for the application.
                </p>
              </div>
            </div>

            <!-- AI Tab -->
            <div id="tab-ai" class="tab-content ${this.currentTab === 'ai' ? '' : 'hidden'}">
              <ai-settings-panel></ai-settings-panel>
            </div>

            <!-- Tools Tab -->
            <div id="tab-tools" class="tab-content ${this.currentTab === 'tools' ? '' : 'hidden'}">
              <tools-settings-panel></tools-settings-panel>
            </div>

            <!-- Quick AI Tab (legacy, shown for backwards compatibility) -->
            <div id="tab-quick-ai" class="tab-content ${this.currentTab === 'quick-ai' ? '' : 'hidden'} space-y-6">
              <!-- Quick AI Default Provider -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="default-provider">
                  Default Provider
                </label>
                <select
                  id="default-provider-select"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">-- Select Provider --</option>
                  ${this.providers.map(provider =>
                    `<option value="${this.escapeHtml(provider.id)}" ${defaultProviderId === provider.id ? 'selected' : ''}>${this.escapeHtml(provider.name)}</option>`
                  ).join('')}
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Default LLM provider for Quick AI conversations (Option+Q).
                </p>
              </div>

              <!-- Quick AI Default Model Config -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="default-model">
                  Default Model
                </label>
                <select
                  id="default-model-select"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">-- Select Model --</option>
                  ${this.modelConfigs.map(model =>
                    `<option value="${this.escapeHtml(model.id)}" ${defaultModelConfigId === model.id ? 'selected' : ''}>${this.escapeHtml(model.name)}</option>`
                  ).join('')}
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Default model configuration for Quick AI conversations.
                </p>
              </div>
            </div>

            <!-- Feature-specific tab containers will be rendered here -->
            ${this.renderFeatureTabs(featureTabs)}
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
            <button
              id="cancel-btn"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-0 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.initializeFeaturePanels(featureTabs);
  }

  /**
   * Render feature tab containers
   */
  private renderFeatureTabs(featureTabs: FeatureSettingsRegistration[]): string {
    return featureTabs.map(tab => {
      const isActive = this.currentTab === tab.featureId;
      return `
        <div id="tab-${tab.featureId}" class="tab-content ${isActive ? '' : 'hidden'}" data-feature-id="${tab.featureId}">
          <!-- Feature panel will be inserted here -->
        </div>
      `;
    }).join('');
  }

  /**
   * Initialize feature panel components after render
   */
  private initializeFeaturePanels(featureTabs: FeatureSettingsRegistration[]): void {
    featureTabs.forEach(tab => {
      const container = this.querySelector(`#tab-${tab.featureId}`);
      if (container && !container.querySelector(tab.panelTagName)) {
        // Create the feature panel element
        const panel = document.createElement(tab.panelTagName);
        // Pass settings via a property or data attribute
        if ('settings' in panel) {
          (panel as any).settings = this.settings?.features?.[tab.featureId] || {};
        }
        panel.setAttribute('data-settings', JSON.stringify(this.settings?.features?.[tab.featureId] || {}));
        container.appendChild(panel);
      }
    });
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.querySelector('#close-btn');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Cancel button
    const cancelBtn = this.querySelector('#cancel-btn');
    if (cancelBtn) {
      const newBtn = cancelBtn.cloneNode(true);
      cancelBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.close());
    }

    // Tab buttons
    const tabBtns = this.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab as SettingsTab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

    // Theme radio buttons
    const themeRadios = this.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      const newRadio = radio.cloneNode(true);
      radio.replaceWith(newRadio);
      (newRadio as HTMLElement).addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.handleThemeChange(target.value);
        }
      });
    });

    // Browse button for project folder
    const browseProjectFolderBtn = this.querySelector('#browse-project-folder-btn');
    if (browseProjectFolderBtn) {
      const newBtn = browseProjectFolderBtn.cloneNode(true);
      browseProjectFolderBtn.replaceWith(newBtn);
      (newBtn as HTMLElement).addEventListener('click', () => this.browseProjectFolder());
    }

    // Default provider dropdown
    const providerSelect = this.querySelector('#default-provider-select');
    if (providerSelect) {
      (providerSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleProviderChange(target.value);
      });
    }

    // Default model config dropdown
    const modelSelect = this.querySelector('#default-model-select');
    if (modelSelect) {
      (modelSelect as HTMLSelectElement).addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleModelConfigChange(target.value);
      });
    }
  }

  private switchTab(tab: SettingsTab): void {
    this.currentTab = tab;
    this.render();
  }

  private async handleThemeChange(newTheme: string): Promise<void> {
    const theme = newTheme === 'dark' ? 'dark' : 'light';

    if (theme === this.currentTheme) {
      return; // No change
    }

    try {
      // Update settings
      await this.api.updateSettings({ theme });
      this.currentTheme = theme;

      // Apply theme immediately to DOM
      this.applyTheme();
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert the radio selection if update failed
      const radio = this.querySelector(`input[name="theme"][value="${this.currentTheme}"]`) as HTMLInputElement;
      if (radio) {
        radio.checked = true;
      }
    }
  }

  private applyTheme(): void {
    const htmlElement = document.documentElement;

    if (this.currentTheme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }

  private async browseProjectFolder(): Promise<void> {
    try {
      // Use the settings API to open folder dialog
      const location = await this.api.openFolderDialog();
      if (location) {
        // Update settings
        await this.api.updateSettings({ projectFolder: location });
        this.settings = { ...this.settings!, projectFolder: location };

        // Update input field
        const input = this.querySelector('#project-folder-input') as HTMLInputElement;
        if (input) {
          input.value = location;
        }
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
    }
  }

  private async handleProviderChange(providerId: string): Promise<void> {
    try {
      // Clear model config selection if provider changes
      await this.api.updateSettings({
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      });
      this.settings = {
        ...this.settings!,
        defaultProviderId: providerId || undefined,
        defaultModelConfigId: undefined
      };

      // Reset model config dropdown
      const modelSelect = this.querySelector('#default-model-select') as HTMLSelectElement;
      if (modelSelect) {
        modelSelect.value = '';
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
    }
  }

  private async handleModelConfigChange(modelConfigId: string): Promise<void> {
    try {
      await this.api.updateSettings({
        defaultModelConfigId: modelConfigId || undefined
      });
      this.settings = {
        ...this.settings!,
        defaultModelConfigId: modelConfigId || undefined
      };
    } catch (error) {
      console.error('Failed to update model config:', error);
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('settings-dialog-close', {
      bubbles: true,
      composed: true
    }));
    this.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('settings-dialog', SettingsDialog);

// Factory function to create and open the dialog
export function openSettingsDialog(tab?: string): SettingsDialog {
  const dialog = document.createElement('settings-dialog') as SettingsDialog;
  if (tab) {
    dialog.dataset.tab = tab;
  }
  document.body.appendChild(dialog);
  return dialog;
}
