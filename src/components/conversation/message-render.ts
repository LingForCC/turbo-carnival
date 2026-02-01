import { escapeHtml, renderMarkdown, renderReasoningSection } from './utils';

/**
 * Message rendering utilities for conversation panel
 * These functions can be injected into conversation-panel for customization
 */

export interface MessageRenderers {
  renderAssistantMessage?: (content: string, reasoning?: string) => string;
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
    renderAssistantMessage
  };
}
