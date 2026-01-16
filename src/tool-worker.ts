/**
 * Tool Worker Process
 *
 * This worker executes JavaScript code in isolation from the main process.
 * It listens for execution requests via IPC and returns results.
 *
 * Security features:
 * - Runs in a separate Node.js process
 * - Enforces execution timeouts
 * - No access to main process memory
 * - Exits immediately after execution
 */

interface WorkerMessage {
  type: 'execute';
  code: string;
  parameters: Record<string, any>;
  timeout: number;
}

interface WorkerResponse {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

// Listen for messages from parent process
process.on('message', (message: WorkerMessage) => {
  if (message.type !== 'execute') {
    const response: WorkerResponse = {
      success: false,
      error: 'Unknown message type',
      executionTime: 0
    };
    process.send(response);
    return;
  }

  const startTime = Date.now();
  const { code, parameters, timeout } = message;

  // Use async wrapper to support both sync and async functions
  (async () => {
    try {
      // Create a function from the code string
      // The code should export a function named "tool" or "run"
      const toolFunction = new Function('params', `
        "use strict";
        ${code}

        // Try to call the function if code exports one
        if (typeof tool === 'function') {
          return tool(params);
        } else if (typeof run === 'function') {
          return run(params);
        } else {
          throw new Error('Tool code must export a function named "tool" or "run"');
        }
      `);

      // Set timeout to prevent infinite loops
      const timeoutId = setTimeout(() => {
        const timeoutResponse: WorkerResponse = {
          success: false,
          error: `Tool execution timed out after ${timeout}ms`,
          executionTime: timeout
        };
        process.send(timeoutResponse);
        process.exit(1);
      }, timeout);

      // Execute the function (may return a Promise for async functions)
      let result = toolFunction(parameters);

      // If the function returned a Promise, await it
      if (result instanceof Promise) {
        result = await result;
      }

      // Clear timeout on success
      clearTimeout(timeoutId);

      const executionTime = Date.now() - startTime;

      // Send result back to parent
      const successResponse: WorkerResponse = {
        success: true,
        result,
        executionTime
      };
      process.send(successResponse);

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorResponse: WorkerResponse = {
        success: false,
        error: error.message || String(error),
        executionTime
      };
      process.send(errorResponse);
    }

    // Exit worker after execution completes (moved inside async wrapper)
    process.exit(0);
  })();
});