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

import type { ToolExecutionResult } from './types/tool-management';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

interface WorkerMessage {
  type: 'execute';
  code: string;
  parameters: Record<string, any>;
  timeout: number;
}

/**
 * Helper function to send response and ensure IPC delivery before exiting
 * This prevents race conditions where the process exits before the message is delivered
 */
function sendResponseAndExit(response: ToolExecutionResult): void {
  if (process.send) {
    // Use a type assertion to work around the complex send() signature
    (process.send as unknown as (message: unknown, callback?: (err: Error | null) => void) => boolean)(
      response,
      (err: Error | null) => {
        // Only exit after the message is confirmed sent
        process.exit(err ? 1 : 0);
      }
    );
  } else {
    // Fallback if process.send is not available
    process.exit(1);
  }
}

// Listen for messages from parent process
process.on('message', (message: WorkerMessage) => {
  if (message.type !== 'execute') {
    const response: ToolExecutionResult = {
      success: false,
      error: 'Unknown message type',
      executionTime: 0
    };
    sendResponseAndExit(response);
    return;
  }

  const startTime = Date.now();
  const { code, parameters, timeout } = message;

  // Use async wrapper to support both sync and async functions
  (async () => {
    try {
      // Create a function from the code string
      // The code should export a function named "tool" or "run"
      // Pass in Node.js modules as parameters for tools to use
      const toolFunction = new Function('params', 'require', 'module', 'exports', '__filename', '__dirname', `
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
        const timeoutResponse: ToolExecutionResult = {
          success: false,
          error: `Tool execution timed out after ${timeout}ms`,
          executionTime: timeout
        };
        sendResponseAndExit(timeoutResponse);
      }, timeout);

      // Execute the function (may return a Promise for async functions)
      // Pass in Node.js CommonJS globals to make require() available in tool code
      const toolRequire = (id: string) => {
        switch (id) {
          case 'fs':
            return fs;
          case 'path':
            return path;
          case 'child_process':
            return childProcess;
          default:
            throw new Error(`Module '${id}' is not available in tool execution context. Available modules: fs, path, child_process`);
        }
      };

      let result = toolFunction(
        parameters,
        toolRequire,
        {},  // module
        {},  // exports
        __filename,
        __dirname
      );

      // If the function returned a Promise, await it
      if (result instanceof Promise) {
        result = await result;
      }

      // Clear timeout on success
      clearTimeout(timeoutId);

      const executionTime = Date.now() - startTime;

      // Send result back to parent
      const successResponse: ToolExecutionResult = {
        success: true,
        result,
        executionTime
      };
      sendResponseAndExit(successResponse);

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse: ToolExecutionResult = {
        success: false,
        error: errorMessage,
        executionTime
      };
      sendResponseAndExit(errorResponse);
    }
  })();
});