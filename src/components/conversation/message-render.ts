import { marked } from 'marked';
import * as DOMPurify from 'dompurify';
import type { ToolCallData } from './conversation-panel';

/**
 * Message rendering utilities for conversation panel
 * These functions can be injected into conversation-panel for customization
 */

export interface MessageRenderers {
  renderUserMessage: (content: string) => string;
  renderAssistantMessage?: (content: string, reasoning?: string) => string;
  renderToolCallMessage: (content: string, toolCall: ToolCallData, reasoning?: string) => string;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely render markdown content with XSS protection
 * Only used for assistant messages (not for tool calls or user messages)
 */
function renderMarkdown(content: string): string {
  try {
    // Parse markdown to HTML
    const html = marked.parse(content) as string;

    // Sanitize HTML to prevent XSS attacks
    // Handle both ESM and CommonJS imports of DOMPurify
    const sanitize = (DOMPurify as any).default?.sanitize || (DOMPurify as any).sanitize || DOMPurify;
    const sanitized = sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
      ALLOW_DATA_ATTR: false
    });

    return sanitized;
  } catch (error) {
    // Fallback to escaped HTML if markdown parsing fails
    console.error('Markdown parsing error:', error);
    return escapeHtml(content);
  }
}

/**
 * Render reasoning/thinking section
 */
function renderReasoningSection(reasoning: string): string {
  return `
    <div class="mb-3">
      <button
        class="reasoning-toggle-btn flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 cursor-pointer border-0 bg-transparent p-0"
      >
        <svg class="w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span>Thinking Process</span>
      </button>
      <div class="reasoning-content hidden mt-2 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md">
        <div class="text-sm text-gray-700 prose prose-sm max-w-none">
          ${renderMarkdown(reasoning)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Default user message renderer
 */
export function renderUserMessage(content: string): string {
  return `
    <div class="flex justify-end">
      <div class="max-w-[85%] rounded-lg px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white">
        <div class="text-sm whitespace-pre-wrap break-words">${escapeHtml(content)}</div>
      </div>
    </div>
  `;
}

/**
 * Default assistant message renderer
 */
export function renderAssistantMessage(content: string, reasoning?: string): string {
  // Build reasoning section (before content)
  const reasoningSection = reasoning ? renderReasoningSection(reasoning) : '';

  // Apply markdown parsing
  const renderedContent = renderMarkdown(content);

  // Action buttons (save and copy)
  const actionButtons = `
    <div class="flex justify-end gap-2 mt-2">
      <button
        class="save-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
        data-message-content="${escapeHtml(content)}"
        title="Save to file"
      >
        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </button>
      <button
        class="copy-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
        data-original-content="${escapeHtml(content)}"
        title="Copy message"
      >
        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    </div>
  `;

  return `
    <div class="flex justify-start group relative">
      <div class="max-w-[85%] rounded-lg px-4 py-2 text-gray-800 dark:text-white">
        ${reasoningSection}
        <div class="text-sm prose prose-sm max-w-none break-words">${renderedContent}</div>
        ${actionButtons}
      </div>
    </div>
  `;
}

/**
 * Default tool call message renderer
 */
export function renderToolCallMessage(
  content: string,
  toolCall: ToolCallData,
  reasoning?: string
): string {
  const isExecuting = toolCall.status === 'executing';
  const isFailed = toolCall.status === 'failed';
  const isCompleted = toolCall.status === 'completed';

  // Background color based on status only (all tool calls are now assistant messages)
  const bgColor = isExecuting
    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
    : (isFailed ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700');

  // Build reasoning section if present (appears before tool call)
  const reasoningSection = reasoning ? renderReasoningSection(reasoning) : '';

  // Status icon (hidden during execution)
  const statusIcon = isExecuting
    ? ''
    : isCompleted
      ? `<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
         </svg>`
      : `<svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
         </svg>`;

  // Status text (hidden during execution)
  const statusText = isExecuting
    ? ''
    : isCompleted
      ? 'Completed'
      : 'Failed';

  return `
    <div class="flex justify-start my-2">
      <div class="max-w-[85%] w-[85%] rounded-lg border ${bgColor} px-4 py-3">
        ${reasoningSection}
        <div class="flex items-center gap-2">
          ${statusIcon}
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate ${isExecuting ? 'flex-1' : ''}">
            ${escapeHtml(toolCall.toolName)}
          </span>
          ${!isExecuting ? `
            <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
            <span class="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">${statusText}</span>
          ` : ''}
          <button
            class="tool-call-toggle-btn hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 cursor-pointer border-0 bg-transparent flex-shrink-0"
          >
            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <div class="tool-call-details hidden mt-3">
          ${toolCall.parameters && Object.keys(toolCall.parameters).length > 0 ? `
            <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <div class="font-semibold mb-1">Parameters:</div>
              <div class="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <pre class="text-xs m-0 whitespace-pre-wrap break-all">${escapeHtml(JSON.stringify(toolCall.parameters, null, 2))}</pre>
              </div>
            </div>
          ` : ''}

          ${isCompleted && toolCall.result ? `
            <div>
              <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Result:</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <pre class="text-xs m-0 whitespace-pre-wrap break-all">${escapeHtml(JSON.stringify(toolCall.result, null, 2))}</pre>
              </div>
              ${toolCall.executionTime ? `
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Execution time: ${toolCall.executionTime}ms</div>
              ` : ''}
            </div>
          ` : ''}

          ${isFailed && toolCall.error ? `
            <div>
              <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Error:</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <pre class="text-xs m-0 whitespace-pre-wrap break-all text-red-700 dark:text-red-400">${escapeHtml(toolCall.error)}</pre>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render app code callout section
 */
function renderAppCodeCallout(htmlCode: string, index: number): string {
  return `
    <div class="mb-3">
      <button
        class="app-code-toggle-btn flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer border-0 bg-transparent p-0"
      >
        <svg class="w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span>App Code${index > 0 ? ` ${index + 1}` : ''}</span>
      </button>
      <div class="app-code-content hidden mt-2 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
        <pre class="text-xs m-0 whitespace-pre-wrap break-all">${escapeHtml(htmlCode)}</pre>
      </div>
    </div>
  `;
}

/**
 * App-specific message renderer
 * Extracts HTML code blocks and renders them as 'App Code' callouts
 * All other content is rendered as normal markdown
 */
export function renderAppContent(content: string, reasoning?: string): string {
  // Extract all HTML code blocks using regex
  const htmlCodeRegex = /```html\n([\s\S]*?)\n```/g;
  const htmlCodeBlocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = htmlCodeRegex.exec(content)) !== null) {
    htmlCodeBlocks.push(match[1]);
  }

  // Remove HTML code blocks from the main content
  const mainContent = content.replace(htmlCodeRegex, '').trim();

  // Build reasoning section (before content)
  const reasoningSection = reasoning ? renderReasoningSection(reasoning) : '';

  // Build app code callouts (if any HTML blocks were found)
  const appCodeCallouts = htmlCodeBlocks
    .map((code, index) => renderAppCodeCallout(code, index))
    .join('');

  // Apply markdown parsing to main content
  const renderedContent = mainContent ? renderMarkdown(mainContent) : '';

  // Action buttons (save and copy)
  const actionButtons = `
    <div class="flex justify-end gap-2 mt-2">
      <button
        class="save-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
        data-message-content="${escapeHtml(content)}"
        title="Save to file"
      >
        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </button>
      <button
        class="copy-msg-btn p-1.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
        data-original-content="${escapeHtml(content)}"
        title="Copy message"
      >
        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    </div>
  `;

  return `
    <div class="flex justify-start group relative">
      <div class="max-w-[85%] rounded-lg px-4 py-2 text-gray-800 dark:text-white">
        ${reasoningSection}
        ${appCodeCallouts}
        ${renderedContent ? `<div class="text-sm prose prose-sm max-w-none break-words">${renderedContent}</div>` : ''}
        ${actionButtons}
      </div>
    </div>
  `;
}

/**
 * Default message renderers object
 */
export function createDefaultMessageRenderers(): MessageRenderers {
  return {
    renderUserMessage,
    renderAssistantMessage,
    renderToolCallMessage
  };
}
