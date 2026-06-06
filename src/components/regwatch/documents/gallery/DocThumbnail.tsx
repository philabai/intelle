import { generateHTML } from "@tiptap/html";
import { EDITOR_EXTENSIONS } from "../editor/extensions";
import type { InternalDocumentKind } from "@/lib/regwatch/internal-documents";
import { sanitiseBodyDoc } from "@/lib/regwatch/templates/sanitise-body-doc";

interface Props {
  bodyDoc: unknown;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  title: string;
  docKind: InternalDocumentKind;
}

/**
 * Server-rendered miniature preview for a doc card.
 *
 *   - Editor-authored docs (body_doc set): render the first few PM nodes
 *     via @tiptap/html so the card shows real headings + first paragraph.
 *   - Upload-only docs (file_path set, no body_doc): show a file-icon
 *     placeholder with the extension badge.
 *   - Empty docs: show a typeset blank-document hint with the doc kind.
 *
 * Heavy PDF rasterization (the cached `_thumb.png` route) is intentionally
 * deferred — it adds infra cost for marginal v1 value and would push the
 * page route bundle toward the 250MB Vercel limit. Add it later if real
 * customers ask for visual fidelity on PDF cards.
 */
export function DocThumbnail({
  bodyDoc,
  filePath,
  fileName,
  mimeType,
  title,
  docKind,
}: Props) {
  if (bodyDoc) {
    return <EditorBodyThumb bodyDoc={bodyDoc} />;
  }
  if (filePath) {
    return (
      <FileThumb fileName={fileName} mimeType={mimeType} title={title} />
    );
  }
  return <BlankThumb title={title} docKind={docKind} />;
}

// ---------------------------------------------------------------------------
// Editor-body thumb — first ~10 nodes rendered with the read-only CSS
// ---------------------------------------------------------------------------

function EditorBodyThumb({ bodyDoc }: { bodyDoc: unknown }) {
  let html: string;
  try {
    const sanitised = sanitiseBodyDoc(bodyDoc);
    const trimmed = trimToFirstNodes(sanitised, 10);
    html = generateHTML(
      trimmed as Parameters<typeof generateHTML>[0],
      EDITOR_EXTENSIONS,
    );
  } catch {
    html = "";
  }
  return (
    <div className="relative h-40 overflow-hidden rounded-t-lg border-b border-card-border bg-background">
      <div
        className="prose prose-invert max-w-none px-3 pt-3 pb-0 text-[7px] leading-tight prose-headings:font-semibold prose-h1:text-[10px] prose-h2:text-[8px] prose-h3:text-[7px] prose-table:border prose-table:border-card-border prose-th:bg-card-bg/30 prose-th:p-0.5 prose-td:p-0.5 prose-td:border prose-td:border-card-border"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

// Trim a PM doc to its first N top-level nodes (best-effort — heading/table
// + their immediate children all count). We just take the first N entries
// of doc.content unchanged.
function trimToFirstNodes(bodyDoc: unknown, n: number): unknown {
  if (!bodyDoc || typeof bodyDoc !== "object") return bodyDoc;
  const d = bodyDoc as { type?: string; content?: unknown[]; schemaVersion?: number };
  if (d.type !== "doc" || !Array.isArray(d.content)) return bodyDoc;
  return {
    type: "doc",
    schemaVersion: d.schemaVersion,
    content: d.content.slice(0, n),
  };
}

// ---------------------------------------------------------------------------
// Upload-only thumb — file icon + extension badge
// ---------------------------------------------------------------------------

function FileThumb({
  fileName,
  mimeType,
  title,
}: {
  fileName: string | null;
  mimeType: string | null;
  title: string;
}) {
  const ext = deriveExtension(fileName, mimeType);
  const tone = ext === "PDF" ? "from-red-500/15" : ext === "DOCX" ? "from-blue-500/15" : "from-card-bg/40";
  return (
    <div className={`relative h-40 overflow-hidden rounded-t-lg border-b border-card-border bg-gradient-to-br ${tone} to-card-bg/10`}>
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <div className="flex h-14 w-11 items-center justify-center rounded-sm border border-card-border bg-background/80 text-[10px] font-medium tracking-wider text-muted">
          {ext}
        </div>
        <p className="line-clamp-2 text-[10px] text-muted">
          {fileName ?? title}
        </p>
      </div>
    </div>
  );
}

function deriveExtension(fileName: string | null, mimeType: string | null): string {
  if (fileName) {
    const m = fileName.match(/\.([a-zA-Z0-9]{1,5})$/);
    if (m) return m[1].toUpperCase();
  }
  if (mimeType) {
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType.includes("wordprocessingml")) return "DOCX";
    if (mimeType.startsWith("text/")) return "TXT";
    if (mimeType.startsWith("image/")) return mimeType.split("/")[1].toUpperCase();
  }
  return "FILE";
}

// ---------------------------------------------------------------------------
// Blank thumb — kind label + dotted background
// ---------------------------------------------------------------------------

function BlankThumb({
  title,
  docKind,
}: {
  title: string;
  docKind: InternalDocumentKind;
}) {
  return (
    <div className="relative h-40 overflow-hidden rounded-t-lg border-b border-card-border bg-card-bg/20">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--card-border, #2a3142) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-brand-teal">
          {docKind}
        </p>
        <p className="line-clamp-2 text-[11px] text-muted">{title}</p>
      </div>
    </div>
  );
}
