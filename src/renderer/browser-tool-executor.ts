/**
 * Browser Tool Executor
 *
 * Executes tool code directly in the browser (renderer) context.
 * Provides access to browser APIs (fetch, localStorage, DOM, etc.)
 * instead of Node.js APIs (fs, path, child_process, etc.)
 */

import type { ToolExecutionResult } from '../types/tool-management';

/**
 * Execute tool code in browser context
 * @param code - JavaScript code string (must export function named "tool" or "run")
 * @param parameters - Parameters object to pass to the tool function
 * @param timeout - Execution timeout in milliseconds
 * @returns Execution result with success status, result/error, and execution time
 */
export async function executeToolInBrowser(
  code: string,
  parameters: Record<string, any>,
  timeout: number
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

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

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);
    });

    // Execute the function (may return a Promise for async functions)
    let result = toolFunction(parameters);

    // If the function returned a Promise, await it
    if (result instanceof Promise) {
      result = await Promise.race([
        result,
        timeoutPromise
      ]);
    } else {
      // For sync functions, still race with timeout
      await Promise.race([
        Promise.resolve(result),
        timeoutPromise
      ]);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      result,
      executionTime
    };

  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}
