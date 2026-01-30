// Import Tailwind CSS
import './styles.css';

// Import Web Components
import './components/project-panel';
import './components/chat-panel';
import './components/app-panel';
import './components/project-agent-dashboard';
import './components/app-container';
import './components/agent-form-dialog';
import './components/provider-dialog';
import './components/project-detail-panel';
import './components/conversation/conversation-panel';

// Import browser tool executor
import { executeToolInBrowser } from './renderer/browser-tool-executor';

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
