// Import Tailwind CSS
import './core/styles.css';

// Import Web Components
import './project/components/project-panel';
import './agent/components/chat-panel';
import './agent/components/app-panel';
import './core/project-agent-dashboard';
import './core/app-container';
import './agent/components/agent-form-dialog';
import './llm/components/provider-dialog';
import './project/components/project-detail-panel';
import './conversation/components/conversation-panel';

// Import browser tool executor
import { executeToolInBrowser } from './tools/browser/browser-tool-executor';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Access the exposed API from the preload script (if available)
  if (window.electronAPI) {
    console.log(`Running on: ${window.electronAPI.platform}`);

    // Set up browser tool execution handler
    window.electronAPI.onBrowserToolExecution?.((request) => {
      executeToolInBrowser(request.code, request.parameters, request.timeout)
        .then(result => {
          window.electronAPI?.sendBrowserToolResult?.(result);
        })
        .catch(error => {
          window.electronAPI?.sendBrowserToolResult?.({
            success: false,
            error: error.message || String(error),
            executionTime: 0
          });
        });
    });
  }

  console.log('Renderer process initialized with Web Components');

  // Example: Listen for agent selection events
  const appContainer = document.querySelector('app-container');
  if (appContainer) {
    appContainer.addEventListener('agent-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Agent selected:', customEvent.detail);
    });
  }
});
