// Extend the Window interface to include our exposed API
export {};

declare global {
  interface Window {
    electronAPI: {
      platform: string;
    };
  }
}

// Access the exposed API from the preload script
const platformInfo = document.getElementById('platform-info');
if (platformInfo && window.electronAPI) {
  platformInfo.textContent = `Running on: ${window.electronAPI.platform}`;
}

console.log('Renderer process initialized');
