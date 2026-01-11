// Import Tailwind CSS
import './styles.css';

// Import Web Components
import './components/project-panel';
import './components/chat-panel';
import './components/project-agent-dashboard';
import './components/app-container';
import './components/agent-form-dialog';
import './components/api-keys-dialog';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Access the exposed API from the preload script (if available)
  if (window.electronAPI) {
    console.log(`Running on: ${window.electronAPI.platform}`);
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
