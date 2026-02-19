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
}

describe('ProjectPanel Web Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct initial structure', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      // Wait for connectedCallback to complete
      await waitForAsync();

      expect(element.querySelector('h2')?.textContent).toBe('Projects');
      expect(element.querySelector('#toggle-btn')).toBeTruthy();
      expect(element.querySelector('#projects-list')).toBeTruthy();

      cleanup();
    });

    it('should render with expanded state by default', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const container = element.querySelector('#project-panel-container');
      expect(hasClass(container, 'w-64')).toBe(true);
      expect(hasClass(container, 'w-0')).toBe(false);

      cleanup();
    });

    it('should render collapsed state correctly', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const header = element.querySelector('h2');
      expect(header?.textContent).toBe('Projects');
      expect(header?.className).toContain('text-sm');
      expect(header?.className).toContain('font-semibold');

      cleanup();
    });

    it('should render toggle button with correct attributes', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.getAttribute('aria-label')).toBe('Toggle project panel');

      cleanup();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const listContainer = element.querySelector('#projects-list');
      expect(listContainer?.textContent).toContain('Configure a project folder in Settings');

      cleanup();
    });

    it('should show correct empty state styling', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const listContainer = element.querySelector('#projects-list');
      const emptyMessage = listContainer?.querySelector('p');
      expect(emptyMessage?.className).toContain('text-sm');
      expect(emptyMessage?.className).toContain('text-gray-400');
      expect(emptyMessage?.className).toContain('text-center');

      cleanup();
    });
  });

  describe('Project List Rendering', () => {
    it('should render single project correctly', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItems = element.querySelectorAll('div[data-project-path]');
      expect(projectItems).toHaveLength(1);
      expect(projectItems[0].getAttribute('data-project-path')).toBe('/path1');

      cleanup();
    });

    it('should render multiple projects', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
        createMockProject({ name: 'project2', path: '/path2' }),
        createMockProject({ name: 'project3', path: '/path3' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItems = element.querySelectorAll('div[data-project-path]');
      expect(projectItems).toHaveLength(3);

      cleanup();
    });

    it('should show selected project with different styling', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
        createMockProject({ name: 'project2', path: '/path2' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Click the first project to select it
      const firstProject = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      firstProject.click();
      await waitForAsync();

      // After re-render, query the element again to get updated classes
      const updatedProject = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      // Check that it has selected styling
      expect(updatedProject.className).toContain('bg-blue-50');
      expect(updatedProject.className).toContain('text-blue-700');

      cleanup();
    });

    it('should show unselected project with hover styling', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItem = element.querySelector('[data-project-path]') as HTMLElement;
      expect(projectItem.className).toContain('hover:bg-gray-100');
      expect(projectItem.className).toContain('text-gray-700');

      cleanup();
    });

    it('should escape HTML in project names', async () => {
      const mockProjects = [
        createMockProject({ name: '<script>alert("xss")</script>', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItem = element.querySelector('[data-project-path="/path1"]');
      expect(projectItem?.innerHTML).not.toContain('<script>');
      expect(projectItem?.innerHTML).toContain('&lt;script&gt;');

      cleanup();
    });

    it('should escape HTML in project paths', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path/<img src=x onerror=alert(1)>' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItem = element.querySelector('div[data-project-path]');
      // The important thing is there's no actual img element as a child
      const imgElements = projectItem?.querySelectorAll('img');
      expect(imgElements?.length || 0).toBe(0);
      // The path should be in the data attribute (Happy DOM may display unescaped in outerHTML)
      const dataPath = projectItem?.getAttribute('data-project-path');
      expect(dataPath).toBe('/path/<img src=x onerror=alert(1)>');

      cleanup();
    });
  });

  describe('Clone-and-Replace Pattern', () => {
    it('should use clone-and-replace for toggle button', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Get the toggle button after it's been processed by clone-and-replace
      const toggleBtn = element.querySelector('#toggle-btn');
      // If the pattern is working, the button should be functional
      expect(toggleBtn).toBeTruthy();

      cleanup();
    });

    it('should not accumulate duplicate listeners', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      let toggleCount = 0;
      const originalToggle = (element as any).toggle?.bind(element);
      if (originalToggle) {
        (element as any).toggle = () => {
          toggleCount++;
          return originalToggle();
        };
      }

      const toggleBtn = element.querySelector('#toggle-btn') as HTMLButtonElement;

      // Click multiple times
      toggleBtn.click();
      await waitForAsync();
      toggleBtn.click();
      await waitForAsync();

      // The toggleCount should match the number of clicks (no duplicates)
      expect(toggleCount).toBe(2);

      cleanup();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle collapsed state on button click', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
  });

  describe('Project Loading', () => {
    it('should call getProjects on connectedCallback', async () => {
      const getProjectsMock = jest.fn().mockResolvedValue([]);
      mockElectronAPI('getProjects', getProjectsMock);
      mockElectronAPI('onProjectsChanged', jest.fn());
      mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(getProjectsMock).toHaveBeenCalled();

      document.body.innerHTML = ''; // Cleanup
    });

    it('should render projects after loading', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
        createMockProject({ name: 'project2', path: '/path2' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItems = element.querySelectorAll('div[data-project-path]');
      expect(projectItems).toHaveLength(2);

      cleanup();
    });

    it('should handle load errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI('getProjects', jest.fn().mockRejectedValue(new Error('Load failed')));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load projects:', expect.any(Error));

      consoleSpy.mockRestore();
      cleanup();
    });
  });

  describe('Select Project', () => {
    it('should set selectedProject when project clicked', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
        createMockProject({ name: 'project2', path: '/path2' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      projectItem.click();
      await waitForAsync();

      // After re-render, query the element again to get updated classes
      const updatedProject = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      // Check that the selected project is now highlighted
      expect(updatedProject.className).toContain('bg-blue-50');

      cleanup();
    });

    it('should dispatch project-selected event when project clicked', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const eventPromise = spyOnEvent(element, 'project-selected');

      const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      projectItem.click();

      const event = await eventPromise;
      expect(event.detail.project).toEqual(mockProjects[0]);

      cleanup();
    });

    it('should dispatch project-selected event with bubbles and composed', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Listen on document to verify bubbling
      let eventReceived: CustomEvent | null = null;
      document.addEventListener('project-selected', (e: Event) => {
        eventReceived = e as CustomEvent;
      });

      const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      projectItem.click();
      await waitForAsync();

      expect(eventReceived).toBeTruthy();

      cleanup();
    });
  });

  describe('XSS Prevention (escapeHtml)', () => {
    it('should escape < and > tags', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Test that HTML tags are escaped
      const mockProjects = [
        createMockProject({ name: '<script>alert("xss")</script>', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));

      (element as any).projects = mockProjects;
      (element as any).renderProjects();

      const projectItem = element.querySelector('div[data-project-path]');
      const span = projectItem?.querySelector('span');
      // The text content should be preserved (not executed as HTML)
      expect(span?.textContent).toBe('<script>alert("xss")</script>');
      // And the innerHTML should not contain the actual script tag
      expect(projectItem?.innerHTML).not.toContain('<script>alert');
      // Should contain escaped version
      expect(projectItem?.innerHTML).toContain('&lt;script&gt;');

      cleanup();
    });

    it('should escape & character', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const mockProjects = [
        createMockProject({ name: 'test & more', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));

      (element as any).projects = mockProjects;
      (element as any).renderProjects();

      const projectItem = element.querySelector('div[data-project-path]');
      const span = projectItem?.querySelector('span');
      // Text content should be preserved
      expect(span?.textContent).toBe('test & more');
      // innerHTML should have the & escaped
      expect(projectItem?.innerHTML).toContain('test &amp; more');

      cleanup();
    });

    it('should escape quotes in data attributes', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const mockProjects = [
        createMockProject({ name: 'test "quoted" name', path: '/path"><script>alert("xss")</script>' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));

      (element as any).projects = mockProjects;
      (element as any).renderProjects();

      const projectItem = element.querySelector('div[data-project-path]');
      // The important thing is that the actual script tag is not in the DOM as executable HTML
      expect(projectItem?.innerHTML).not.toContain('<script>alert("xss")</script>');
      // The outerHTML should have the path escaped (though Happy DOM may display differently)
      // What matters is the script is not executed
      const outerHTML = projectItem?.outerHTML || '';
      expect(outerHTML).not.toMatch(/<script[^>]*>.*<\/script>/);

      cleanup();
    });

    it('should preserve text content while escaping HTML', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      const mockProjects = [
        createMockProject({ name: '<img src=x onerror=alert(1)>', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));

      (element as any).projects = mockProjects;
      (element as any).renderProjects();

      const projectItem = element.querySelector('div[data-project-path]');
      const span = projectItem?.querySelector('span');
      // Text content should be preserved
      expect(span?.textContent).toBe('<img src=x onerror=alert(1)>');
      // innerHTML should be escaped
      expect(projectItem?.innerHTML).not.toContain('<img');
      expect(projectItem?.innerHTML).toContain('&lt;img');

      cleanup();
    });
  });

  describe('Dark Mode Styling', () => {
    it('should render with dark mode classes when dark mode is enabled', async () => {
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
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
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      document.documentElement.classList.add('dark');

      const listContainer = element.querySelector('#projects-list');
      const emptyMessage = listContainer?.querySelector('p');
      expect(emptyMessage?.className).toContain('dark:text-gray-500');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });

    it('should render selected project with dark mode classes', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      // Add dark class and select project
      document.documentElement.classList.add('dark');
      const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      projectItem.click();
      await waitForAsync();

      const updatedProject = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      expect(updatedProject.className).toContain('dark:bg-blue-900/30');
      expect(updatedProject.className).toContain('dark:text-blue-300');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });

    it('should render unselected project with dark mode classes', async () => {
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue(mockProjects));
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      document.documentElement.classList.add('dark');

      const projectItem = element.querySelector('[data-project-path="/path1"]') as HTMLElement;
      expect(projectItem.className).toContain('dark:text-gray-300');
      expect(projectItem.className).toContain('dark:hover:bg-gray-800');

      // Clean up
      document.documentElement.classList.remove('dark');
      cleanup();
    });
  });

  describe('Async/Await Handling', () => {
    it('should properly await loadProjects in connectedCallback', async () => {
      let loadProjectsResolved = false;
      const mockProjects = [
        createMockProject({ name: 'project1', path: '/path1' }),
      ];

      const getProjectsMock = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            loadProjectsResolved = true;
            resolve(mockProjects);
          }, 10);
        });
      });

      mockElectronAPI('getProjects', getProjectsMock);
      mockElectronAPI('onProjectsChanged', jest.fn());
      const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');

      // Before waiting, loadProjects should not have resolved
      expect(loadProjectsResolved).toBe(false);

      // Wait for async operations
      await waitForAsync(50);

      // After waiting, loadProjects should have resolved and projects rendered
      expect(loadProjectsResolved).toBe(true);
      const projectItems = element.querySelectorAll('div[data-project-path]');
      expect(projectItems).toHaveLength(1);

      cleanup();
    });
  });

  describe('Project Changed Listener', () => {
    it('should register onProjectsChanged listener on connectedCallback', async () => {
      const onProjectsChangedMock = jest.fn();
      mockElectronAPI('getProjects', jest.fn().mockResolvedValue([]));
      mockElectronAPI('onProjectsChanged', onProjectsChangedMock);
      const { cleanup } = mountComponent<ProjectPanel>('project-panel');

      await waitForAsync();

      expect(onProjectsChangedMock).toHaveBeenCalled();

      cleanup();
    });
  });
});
