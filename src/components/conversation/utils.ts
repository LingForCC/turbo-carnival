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
