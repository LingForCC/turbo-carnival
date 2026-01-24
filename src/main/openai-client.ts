import { ipcMain } from 'electron';
import type { LLMProvider } from '../global.d.ts';

// ============ TOOL EXECUTION ============

/**
 * Execute a tool with environment-aware routing
 * Routes to worker process for Node.js tools, or renderer for browser tools
 *
 * Note: Parameter validation should be done by the caller before calling this function
 */
export async function executeToolWithRouting(
  tool: any,
  parameters: Record<string, any>,
  webContents?: Electron.WebContents
): Promise<any> {
  const environment = tool.environment || 'node';

  if (environment === 'browser' && webContents) {
    // Browser tools: Forward to renderer process
    return new Promise((resolve, reject) => {
      const timeout = tool.timeout || 30000;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Browser tool execution timed out after ${timeout}ms`));
      }, timeout);

      const responseHandler = (_event: any, result: any) => {
        cleanup();
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Browser tool execution failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        ipcMain.removeListener('tools:browserResult', responseHandler);
      };

      ipcMain.on('tools:browserResult', responseHandler);
      webContents.send('tools:executeBrowser', {
        code: tool.code,
        parameters,
        timeout
      });
    });
  } else {
    // Node.js tools: Execute in worker process
    const { executeToolInWorker } = await import('./tool-worker-executor');
    return executeToolInWorker(tool, parameters);
  }
}
