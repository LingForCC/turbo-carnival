/**
 * Tests for SettingsDialog Web Component
 */

import { mountComponent, mockElectronAPI, waitForAsync } from '../../helpers/component-testing';

// Type for the SettingsDialog element
interface SettingsDialog extends HTMLElement {
  close(): void;
}

describe('SettingsDialog Web Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct initial structure', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: '/some/path'
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      expect(element.querySelector('h2')?.textContent).toBe('App Settings');
      expect(element.querySelector('#close-btn')).toBeTruthy();
      expect(element.querySelector('#cancel-btn')).toBeTruthy();
      expect(element.querySelector('input[name="theme"]')).toBeTruthy();

      cleanup();
    });

    it('should render light theme as selected when settings have light theme', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: ''
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const lightRadio = element.querySelector('input[name="theme"][value="light"]') as HTMLInputElement;
      const darkRadio = element.querySelector('input[name="theme"][value="dark"]') as HTMLInputElement;

      expect(lightRadio.checked).toBe(true);
      expect(darkRadio.checked).toBe(false);

      cleanup();
    });

    it('should render dark theme as selected when settings have dark theme', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'dark',
        notepadSaveLocation: ''
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const lightRadio = element.querySelector('input[name="theme"][value="light"]') as HTMLInputElement;
      const darkRadio = element.querySelector('input[name="theme"][value="dark"]') as HTMLInputElement;

      expect(lightRadio.checked).toBe(false);
      expect(darkRadio.checked).toBe(true);

      cleanup();
    });

    it('should render with notepad location', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: '/Users/test/notepad'
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const input = element.querySelector('#notepad-location-input') as HTMLInputElement;
      expect(input.value).toBe('/Users/test/notepad');

      cleanup();
    });
  });

  describe('Theme Selection', () => {
    it('should update theme when light radio is clicked', async () => {
      const updateSettingsMock = jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: ''
      });

      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'dark',
        notepadSaveLocation: ''
      }));
      mockElectronAPI('updateSettings', updateSettingsMock);

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const lightRadio = element.querySelector('input[name="theme"][value="light"]') as HTMLInputElement;
      lightRadio.checked = true;
      lightRadio.dispatchEvent(new Event('change', { bubbles: true }));

      await waitForAsync();

      expect(updateSettingsMock).toHaveBeenCalledWith({ theme: 'light' });

      cleanup();
    });

    it('should apply theme directly to DOM when theme is updated', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: ''
      }));
      mockElectronAPI('updateSettings', jest.fn().mockResolvedValue({
        theme: 'dark',
        notepadSaveLocation: ''
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      // Initially light theme
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      const darkRadio = element.querySelector('input[name="theme"][value="dark"]') as HTMLInputElement;
      darkRadio.checked = true;
      darkRadio.dispatchEvent(new Event('change', { bubbles: true }));

      await waitForAsync();

      // Theme should be applied directly to DOM
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      cleanup();
    });
  });

  describe('Close Behavior', () => {
    it('should close and dispatch settings-dialog-close event when close button clicked', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: ''
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const eventSpy = jest.fn();
      element.addEventListener('settings-dialog-close', eventSpy);

      const closeBtn = element.querySelector('#close-btn');
      closeBtn?.dispatchEvent(new Event('click'));

      await waitForAsync();

      expect(eventSpy).toHaveBeenCalled();

      cleanup();
    });

    it('should close and dispatch settings-dialog-close event when cancel button clicked', async () => {
      mockElectronAPI('getSettings', jest.fn().mockResolvedValue({
        theme: 'light',
        notepadSaveLocation: ''
      }));

      const { element, cleanup } = mountComponent<SettingsDialog>('settings-dialog');

      await waitForAsync();

      const eventSpy = jest.fn();
      element.addEventListener('settings-dialog-close', eventSpy);

      const cancelBtn = element.querySelector('#cancel-btn');
      cancelBtn?.dispatchEvent(new Event('click'));

      await waitForAsync();

      expect(eventSpy).toHaveBeenCalled();

      cleanup();
    });
  });
});
