/**
 * Guard against open redirects (CWE-601) on post-auth `next` params.
 *
 * Only same-origin, absolute *path* destinations are allowed. Anything that
 * could navigate off-site — a scheme (`https://`), a protocol-relative URL
 * (`//evil.com`), or a backslash trick (`/\evil.com`, which some browsers
 * normalise to `//`) — is rejected and the fallback is used instead.
 */
export function safeRelativePath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  // Must start with a single slash and stay a path. Reject //, /\, \ and any scheme.
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    next.includes("\\") ||
    next.includes("://")
  ) {
    return fallback;
  }
  return next;
}
