// Import Tailwind CSS
import './styles.css';

// Import Web Components
import './components/project-panel';
import './components/right-panel';
import './components/middle-panel';
import './components/app-container';

// Extend the Window interface to include our exposed API
export {};

declare global {
  interface Window {
    electronAPI: {
      platform: string;
    };
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Access the exposed API from the preload script (if available)
  if (window.electronAPI) {
    console.log(`Running on: ${window.electronAPI.platform}`);
  }

  console.log('Renderer process initialized with Web Components');

  // Example: Listen for text changes from middle panel
  const middlePanel = document.querySelector('middle-panel');
  if (middlePanel) {
    middlePanel.addEventListener('text-change', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Text changed:', customEvent.detail.value);
    });
  }

  // Example: Listen for panel toggle events
  const appContainer = document.querySelector('app-container');
  if (appContainer) {
    appContainer.addEventListener('panel-toggle', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Panel toggled:', customEvent.detail);
    });
  }
});
