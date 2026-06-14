/**
 * Server-side upload validation. Uploads previously trusted the client-supplied
 * MIME type with no allow-list, so a user could store an executable / HTML /
 * SVG (active content) that later gets served or fed to analysis. This enforces
 * an extension + declared-MIME allow-list and a size cap on the server.
 *
 * Note: this is allow-list + size, not content (AV / deep magic-byte) scanning —
 * a malware-scan step before analysis is a recommended follow-up.
 */

export interface UploadProfile {
  /** Lower-case extensions (without dot) that are accepted. */
  extensions: string[];
  /** Accepted declared MIME types (exact, or prefix with trailing '/'). */
  mimeTypes: string[];
  /** Max bytes. */
  maxSize: number;
}

const MB = 1024 * 1024;

/** Documents + images for consulting engagement deliverables. */
export const ENGAGEMENT_DOCS_PROFILE: UploadProfile = {
  extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "md", "png", "jpg", "jpeg", "webp", "heic", "zip"],
  mimeTypes: [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.",
    "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
    "text/plain", "text/csv", "text/markdown",
    "image/", "application/zip", "application/octet-stream",
  ],
  maxSize: 50 * MB,
};

/** Compliance evidence: docs, images, and (mobile-recorded) video. */
export const EVIDENCE_PROFILE: UploadProfile = {
  extensions: ["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "webp", "heic", "mp4", "mov", "m4v"],
  mimeTypes: [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.",
    "text/plain", "image/", "video/", "application/octet-stream",
  ],
  maxSize: 200 * MB,
};

/** Extensions that must never be accepted regardless of profile (active content). */
const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "sh", "com", "msi", "app", "jar",
  "html", "htm", "xhtml", "svg", "js", "mjs", "php", "phtml", "asp", "aspx", "jsp",
]);

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUpload(file: File, profile: UploadProfile): ValidationResult {
  if (file.size === 0) return { ok: false, error: "File is empty" };
  if (file.size > profile.maxSize) {
    return { ok: false, error: `File exceeds the ${Math.round(profile.maxSize / MB)}MB limit` };
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File type ".${ext}" is not allowed` };
  }
  if (!profile.extensions.includes(ext)) {
    return { ok: false, error: `Unsupported file type ".${ext}"` };
  }
  const mime = (file.type || "").toLowerCase();
  if (mime) {
    const allowed = profile.mimeTypes.some((m) =>
      m.endsWith("/") || m.endsWith(".") ? mime.startsWith(m) : mime === m,
    );
    if (!allowed) return { ok: false, error: `Unsupported content type "${mime}"` };
  }
  return { ok: true };
}
