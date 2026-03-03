import { ipcRenderer } from 'electron';

export const externalLinksManagement = {
  openExternalURL: (url: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('external:openURL', url);
  },
};
