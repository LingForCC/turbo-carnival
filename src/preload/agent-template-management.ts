import { ipcRenderer } from 'electron';

export const agentTemplateManagement = {
  getTemplates: () => ipcRenderer.invoke('agent-templates:get'),
  addTemplate: (template: any) => ipcRenderer.invoke('agent-templates:add', template),
  updateTemplate: (id: string, template: any) => ipcRenderer.invoke('agent-templates:update', id, template),
  removeTemplate: (id: string) => ipcRenderer.invoke('agent-templates:remove', id),
  getTemplateById: (id: string) => ipcRenderer.invoke('agent-templates:getById', id),
};
