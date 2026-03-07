const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML special characters to prevent XSS when interpolating into innerHTML.
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Validate that a string is a valid hex color (e.g., #fff, #aabbcc, #aabbccdd).
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(color);
}
