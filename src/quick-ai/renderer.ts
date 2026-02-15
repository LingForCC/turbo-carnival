// Import Tailwind CSS
import '../core/styles.css';

// Import Conversation Panel (required by quick-ai-window)
import '../conversation/components/conversation-panel';

// Import Quick AI Web Component
import './components/quick-ai-window';

// Import browser tool executor
import { executeToolInBrowser } from '../tools/browser/browser-tool-executor';

// Initialize Quick AI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Quick AI initialized');

  // Set up browser tool execution handler
  if (window.electronAPI) {
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
});
