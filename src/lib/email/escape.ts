/**
 * Escape a user-supplied string for safe interpolation into HTML email bodies.
 * Prevents HTML/markup injection (and script in mail clients that execute it)
 * when untrusted form/chat input is rendered into notification emails.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then convert newlines to <br> for multi-line fields (e.g. messages). */
export function escapeHtmlMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}
