import { generateHTML } from "@tiptap/html";
import { EDITOR_EXTENSIONS } from "./extensions";
import { sanitiseBodyDoc } from "@/lib/regwatch/templates/sanitise-body-doc";

interface Props {
  bodyDoc: unknown;
}

/**
 * Server-rendered read-only view of a TipTap document.
 *
 * `generateHTML` lives in `@tiptap/html` and runs in pure Node (no DOM, no
 * client bundle) — safe to render from a server component. The output goes
 * straight to dangerouslySetInnerHTML because the source is our own PM JSON
 * (trusted; not user-provided HTML), already constrained to the locked
 * v1 node set.
 *
 * Styling matches the editor's prose classes so the read-only view and the
 * editor look identical.
 */
export function DocReadOnlyView({ bodyDoc }: Props) {
  if (!bodyDoc) {
    return (
      <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-6 text-center text-xs text-muted">
        This document has no body yet. Click <strong>Edit</strong> to start
        writing.
      </p>
    );
  }
  let html: string;
  try {
    // Cast — generateHTML's JSONContent signature is permissive enough
    // for our PM JSON shape but we hand-author the input.
    const sanitised = sanitiseBodyDoc(bodyDoc);
    html = generateHTML(
      sanitised as Parameters<typeof generateHTML>[0],
      EDITOR_EXTENSIONS,
    );
  } catch (e) {
    return (
      <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300">
        Could not render document body: {(e as Error).message}
      </p>
    );
  }
  return (
    <div className="rounded-lg bg-[#0a0e1a] py-4">
      <div className="mx-auto max-w-[8.5in]">
        <div
          className="regwatch-doc-stream prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base prose-table:border prose-table:border-card-border prose-th:bg-card-bg/40 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-card-border"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
