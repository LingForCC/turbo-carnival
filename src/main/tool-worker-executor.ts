import * as path from 'path';

// ============ TOOL WORKER EXECUTION ============

/**
 * Execute tool code in a separate worker process
 * This provides isolation and prevents tool code from crashing the main process
 */
export async function executeToolInWorker(tool: any, parameters: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, './tool-worker.js');
    const timeout = tool.timeout || 30000;

    try {
      // Spawn worker process
      const worker = require('child_process').fork(workerPath, {
        silent: true, // Don't share stdio
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      let responseReceived = false;

      // Listen for messages from worker (responses)
      worker.on('message', (response: any) => {
        if (responseReceived) return; // Ignore duplicate messages
        responseReceived = true;

        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Tool execution failed'));
        }

        // Clean up worker
        worker.kill();
      });

      // Listen for errors from worker
      worker.on('error', (error: Error) => {
        if (responseReceived) return;
        responseReceived = true;
        reject(new Error(`Worker error: ${error.message}`));
        worker.kill();
      });

      // Handle worker exit
      worker.on('exit', (code: number) => {
        if (!responseReceived) {
          responseReceived = true;
          if (code !== 0) {
            reject(new Error(`Worker process exited with code ${code}`));
          } else {
            reject(new Error('Worker exited without sending response'));
          }
        }
      });

      // Send execution request to worker
      worker.send({
        type: 'execute',
        code: tool.code,
        parameters,
        timeout
      });

    } catch (error: any) {
      reject(new Error(`Failed to spawn worker: ${error.message}`));
    }
  });
}
