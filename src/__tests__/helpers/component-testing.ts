/**
 * Helper utilities for testing Web Components
 */

import type { Project } from '../../global.d';

/**
 * Mount a custom element and return it with testing helpers
 *
 * @param tagName - The custom element tag name (e.g., 'project-panel')
 * @param properties - Optional properties/attributes to set on the element
 * @returns Object containing the element, querySelector helper, and cleanup function
 *
 * @example
 * ```typescript
 * const { element, cleanup } = mountComponent<ProjectPanel>('project-panel');
 * expect(element.querySelector('h2')).toBeTruthy();
 * cleanup();
 * ```
 */
export function mountComponent<T extends HTMLElement>(
  tagName: string,
  properties?: Record<string, any>
): {
  element: T;
  querySelector: (selectors: string) => Element | null;
  cleanup: () => void;
} {
  // Dynamically import and register the component
  // The side effect of importing is that the custom element gets registered
  require(`../../components/${tagName}.ts`);

  const element = document.createElement(tagName) as T;
  document.body.appendChild(element);

  // The connectedCallback should be called automatically by the browser
  // when the element is added to the DOM

  return {
    element,
    querySelector: (selectors: string) => element.querySelector(selectors),
    cleanup: () => element.remove(),
  };
}

/**
 * Mock a window.electronAPI method with a specific implementation
 *
 * @param method - The method name to mock
 * @param implementation - The mock implementation
 *
 * @example
 * ```typescript
 * mockElectronAPI('getProjects', jest.fn().mockResolvedValue([
 *   createMockProject({ name: 'test' })
 * ]));
 * ```
 */
export function mockElectronAPI(method: string, implementation: any): void {
  if (!window.electronAPI) {
    throw new Error('window.electronAPI is not defined. Make sure jest.setup-components.ts is configured.');
  }
  (window.electronAPI as any)[method] = implementation;
}

/**
 * Create a mock Project object with optional overrides
 *
 * @param overrides - Partial project object to override defaults
 * @returns A complete Project object
 *
 * @example
 * ```typescript
 * const mockProject = createMockProject({ name: 'my-project', path: '/path/to/project' });
 * ```
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    path: '/mock/projects/test-project',
    name: 'test-project',
    addedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Wait for a promise to resolve (useful for async component lifecycle)
 *
 * @param ms - Milliseconds to wait (default: 0 for next tick)
 * @returns A promise that resolves after the specified time
 *
 * @example
 * ```typescript
 * await waitForAsync(); // Wait for connectedCallback to complete
 * expect(element.textContent).toContain('Loaded');
 * ```
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Spy on a custom event dispatched by an element
 *
 * @param element - The element to spy on
 * @param eventName - The event name to watch for
 * @returns A promise that resolves when the event is dispatched
 *
 * @example
 * ```typescript
 * const eventPromise = spyOnEvent(element, 'project-selected');
 * element.click();
 * const event = await eventPromise;
 * expect(event.detail.project).toBeDefined();
 * ```
 */
export function spyOnEvent<T = any>(
  element: HTMLElement,
  eventName: string
): Promise<CustomEvent<T>> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      element.removeEventListener(eventName, handler);
      resolve(e as CustomEvent<T>);
    };
    element.addEventListener(eventName, handler);
  });
}
