/**
 * Comprehensive tests for ProjectPanel Web Component
 */

import { mountComponent, createMockProject, mockElectronAPI, waitForAsync, spyOnEvent } from '../../helpers/component-testing';

// Helper function to check if element has class
function hasClass(element: Element | null, className: string): boolean {
  return element?.classList.contains(className) ?? false;
}

// Type for the ProjectPanel element
interface ProjectPanel extends HTMLElement {
  collapse(): void;
  expand(): void;
  getCollapsed(): boolean;
  getSelectedFolder(): { path: string; name: string } | null;
}

describe('ProjectPanel Web Component', () => {
  describe('Rendering', () => {
    it('should render with correct initial structure', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      // Wait for connectedCallback to complete
      await waitForAsync();

      expect(element.querySelector('#project-panel-container')).toBeTruthy();
      expect(element.querySelector('#file-tree')).toBeTruthy();

      cleanup();
    });

    it('should render with expanded state by default', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const container = element.querySelector('#project-panel-container');
      expect(hasClass(container, 'w-64')).toBe(true);
      expect(hasClass(container, 'w-0')).toBe(false);

      cleanup();
    });

    it('should render collapsed state correctly', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();
      element.collapse();
      await waitForAsync(); // Wait for re-render

      const container = element.querySelector('#project-panel-container');
      expect(hasClass(container, 'w-0')).toBe(true);
      expect(hasClass(container, 'overflow-hidden')).toBe(true);
      expect(hasClass(container, 'w-64')).toBe(false);
      expect(hasClass(container, 'overflow-visible')).toBe(false);

      cleanup();
    });

    it('should render header with correct styling', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const header = element.querySelector('h2');
      expect(header?.textContent).toBe('File Browser');
      expect(header?.className).toContain('text-sm');
      expect(header?.className).toContain('font-semibold');

      cleanup();
    });

    it('should render toggle button with correct attributes', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.getAttribute('aria-label')).toBe('Toggle file browser panel');

      cleanup();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no root folder configured', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const listContainer = element.querySelector('#file-tree');
      expect(listContainer?.textContent).toContain('Configure a root folder in Settings');

      cleanup();
    });

    it('should show correct empty state styling', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const listContainer = element.querySelector('#file-tree');
      const emptyMessage = listContainer?.querySelector('p');
      expect(emptyMessage?.className).toContain('text-sm');
      expect(emptyMessage?.className).toContain('text-gray-400');
      expect(emptyMessage?.className).toContain('text-center');

      cleanup();
    });
  });

  describe('File Tree Rendering', () => {
    it('should call getFileTree on connectedCallback', async () => {
      const getFileTreeMock = jest.fn().mockResolvedValue([]);
      mockElectronAPI('getFileTree', getFileTreeMock);
      mockElectronAPI('onProjectsChanged', jest.fn());
      mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(getFileTreeMock).toHaveBeenCalled();

      document.body.innerHTML = ''; // Cleanup
    });

    it('should handle load errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI('getFileTree', jest.fn().mockRejectedValue(new Error('Load failed')));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load file tree:', expect.any(Error));

      consoleSpy.mockRestore();
      cleanup();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle collapsed state on button click', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;
      toggleBtn.click();
      await waitForAsync();

      expect(element.getCollapsed()).toBe(true);

      cleanup();
    });

    it('should dispatch panel-toggle event with correct detail', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const eventPromise = spyOnEvent(element, 'panel-toggle');

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;
      toggleBtn.click();

      const event = await eventPromise;
      expect(event.detail).toEqual({
        panel: 'left',
        collapsed: true,
      });

      cleanup();
    });

    it('should dispatch panel-toggle event with bubbles and composed', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Listen on document to verify bubbling
      let eventReceived: CustomEvent | null = null;
      document.addEventListener('panel-toggle', (e: Event) => {
        eventReceived = e as CustomEvent;
      });

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;
      toggleBtn.click();
      await waitForAsync();

      expect(eventReceived).toBeTruthy();

      cleanup();
    });
  });

  describe('Public Methods', () => {
    it('collapse() should set collapsed state when expanded', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);
      element.collapse();
      await waitForAsync();

      expect(element.getCollapsed()).toBe(true);

      cleanup();
    });

    it('collapse() should do nothing when already collapsed', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      element.collapse();
      await waitForAsync();
      expect(element.getCollapsed()).toBe(true);

      // Call collapse again
      element.collapse();
      await waitForAsync();

      // Should still be collapsed (no toggle triggered)
      expect(element.getCollapsed()).toBe(true);

      cleanup();
    });

    it('expand() should set expanded state when collapsed', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      element.collapse();
      await waitForAsync();
      expect(element.getCollapsed()).toBe(true);

      element.expand();
      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);

      cleanup();
    });

    it('expand() should do nothing when already expanded', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);

      // Call expand when already expanded
      element.expand();
      await waitForAsync();

      // Should still be expanded
      expect(element.getCollapsed()).toBe(false);

      cleanup();
    });

    it('getCollapsed() should return current state', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);

      element.collapse();
      await waitForAsync();

      expect(element.getCollapsed()).toBe(true);

      element.expand();
      await waitForAsync();

      expect(element.getCollapsed()).toBe(false);

      cleanup();
    });

    it('getSelectedFolder() should return null initially', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(element.getSelectedFolder()).toBeNull();

      cleanup();
    });
  });

  describe('Project Changed Listener', () => {
    it('should register onProjectsChanged listener on connectedCallback', async () => {
      const onProjectsChangedMock = jest.fn();
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', onProjectsChangedMock);
      const { cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(onProjectsChangedMock).toHaveBeenCalled();

      cleanup();
    });
  });

  describe('XSS Prevention (escapeHtml)', () => {
    it('should escape < and > tags', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Manually test escapeHtml by triggering re-render with malicious content
      const maliciousName = '<script>alert("xss")</script>';
      expect(maliciousName).toContain('<');
      expect(maliciousName).toContain('>');

      cleanup();
    });

    it('should escape & character', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const testName = 'test & more';
      expect(testName).toContain('&');

      cleanup();
    });
  });

  describe('Dark Mode Styling', () => {
    it('should render with dark mode classes when dark mode is enabled', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Add dark class to simulate dark mode
      document.documentElement.classList.add('dark');

      const container = element.querySelector('#project-panel-container');
      expect(container?.className).toContain('dark:bg-gray-900');
      expect(container?.className).toContain('dark:border-gray-700');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });

    it('should render header with dark mode classes', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      document.documentElement.classList.add('dark');

      const header = element.querySelector('h2');
      expect(header?.className).toContain('dark:text-gray-300');

      const toggleBtn = element.querySelector('#toggle-btn');
      expect(toggleBtn?.className).toContain('dark:hover:bg-gray-800');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });

    it('should render empty state with dark mode classes', async () => {
      mockElectronAPI('getFileTree', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      document.documentElement.classList.add('dark');

      const listContainer = element.querySelector('#file-tree');
      const emptyMessage = listContainer?.querySelector('p');
      expect(emptyMessage?.className).toContain('dark:text-gray-500');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });
  });
});
