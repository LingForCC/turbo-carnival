import { marked } from 'marked';
import * as DOMPurify from 'dompurify';

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely render markdown content with XSS protection
 */
export function renderMarkdown(content: string): string {
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
 * Shared utility for rendering collapsible reasoning content
 */
export function renderReasoningSection(reasoning: string): string {
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
