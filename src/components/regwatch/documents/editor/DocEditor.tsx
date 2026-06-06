"use client";

import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  commitDocumentRevision,
  updateDocumentDraftBody,
} from "@/lib/regwatch/internal-document-revision-actions";
import { exportDocumentAsFile } from "@/lib/regwatch/exports/export-actions";
import {
  formatVersion,
  type SemVer,
  type VersionBump,
} from "@/lib/regwatch/templates/version";
import { Modal } from "@/components/regwatch/Modal";
import { EDITOR_EXTENSIONS } from "./extensions";
import { EditorToolbar } from "./EditorToolbar";
import { SaveVersionDialog } from "./SaveVersionDialog";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";
import { EditorReferencePane } from "./EditorReferencePane";
import { DocMenuBar } from "./DocMenuBar";
import { DocSectionNav } from "./DocSectionNav";
import { sanitiseBodyDoc } from "@/lib/regwatch/templates/sanitise-body-doc";

interface Props {
  documentId: string;
  documentTitle: string;
  documentSubtitle: string;
  initialBodyDoc: unknown;
  initialUpdatedAt: string;
  currentVersion: SemVer | null;
}

type SaveState =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "saved"; at: number }
  | { type: "conflict" }
  | { type: "error"; message: string };

const AUTOSAVE_DEBOUNCE_MS = 3_000;

export function DocEditor({
  documentId,
  documentTitle,
  documentSubtitle,
  initialBodyDoc,
  initialUpdatedAt,
  currentVersion,
}: Props) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ type: "idle" });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const expectedUpdatedAtRef = useRef(initialUpdatedAt);
  const lastSavedDocRef = useRef<string>(JSON.stringify(initialBodyDoc ?? null));
  const autosaveTimerRef = useRef<number | null>(null);

  const sanitisedInitial = useRef(sanitiseBodyDoc(initialBodyDoc));
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: (sanitisedInitial.current as any) ?? undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "regwatch-doc-stream max-w-none text-[15px] leading-7 text-foreground focus:outline-none prose prose-invert prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-table:border prose-table:border-card-border prose-th:bg-card-bg/40 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-card-border",
      },
    },
    onUpdate: () => {
      scheduleAutosave();
    },
  });

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const runAutosave = useCallback(async () => {
    if (!editor) return;
    if (saveState.type === "conflict") return;
    const bodyDoc = editor.getJSON();
    const serialised = JSON.stringify(bodyDoc);
    if (serialised === lastSavedDocRef.current) return;
    setSaveState({ type: "saving" });
    const res = await updateDocumentDraftBody({
      docId: documentId,
      bodyDoc,
      expectedUpdatedAt: expectedUpdatedAtRef.current,
    });
    if (!res.ok) {
      if (res.conflict) {
        setSaveState({ type: "conflict" });
        return;
      }
      setSaveState({
        type: "error",
        message: res.error ?? "Autosave failed",
      });
      return;
    }
    lastSavedDocRef.current = serialised;
    setSaveState({ type: "saved", at: Date.now() });
  }, [editor, documentId, saveState.type]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [runAutosave]);

  async function handleCommit(input: {
    versionBump: VersionBump;
    reasonForChange: string;
  }) {
    if (!editor) return;
    setCommitPending(true);
    setCommitError(null);
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const bodyDoc = editor.getJSON();
    const res = await commitDocumentRevision({
      docId: documentId,
      bodyDoc,
      reasonForChange: input.reasonForChange,
      versionBump: input.versionBump,
      expectedUpdatedAt: expectedUpdatedAtRef.current,
    });
    setCommitPending(false);
    if (!res.ok) {
      if (res.conflict) {
        setCommitError(
          "Someone else saved a newer version. Reload the page to merge their changes.",
        );
        setSaveState({ type: "conflict" });
        return;
      }
      setCommitError(res.error ?? "Could not save version");
      return;
    }
    setSaveDialogOpen(false);
    lastSavedDocRef.current = JSON.stringify(bodyDoc);
    setSaveState({ type: "saved", at: Date.now() });
    router.refresh();
  }

  function handleApplyTemplate(templateBodyDoc: unknown) {
    if (!editor) return;
    const sanitised = sanitiseBodyDoc(templateBodyDoc);
    editor
      .chain()
      .focus()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setContent(sanitised as any, { emitUpdate: true })
      .run();
    setTemplateDialogOpen(false);
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      runAutosave();
    }, 250);
  }

  function hasExistingContent(): boolean {
    if (!editor) return false;
    const doc = editor.getJSON();
    const content = (doc as { content?: unknown[] }).content;
    if (!content || content.length === 0) return false;
    if (content.length === 1) {
      const only = content[0] as { type?: string; content?: unknown[] };
      if (only.type === "paragraph" && (!only.content || only.content.length === 0)) {
        return false;
      }
    }
    return true;
  }

  function appendNewPage() {
    if (!editor) return;
    // Move cursor to end of document, then insert a page break followed by
    // an empty paragraph. The paragraph IS the new page (one element, gets
    // last-child styling so the whole sheet renders properly).
    const end = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .setTextSelection(end)
      .insertContent([
        { type: "pageBreak" },
        { type: "paragraph" },
      ])
      .run();
  }

  async function handleExport(format: "docx" | "pdf") {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await runAutosave();
    setExporting(format);
    setExportError(null);
    const res = await exportDocumentAsFile({ docId: documentId, format });
    setExporting(null);
    if (!res.ok) {
      setExportError(res.error ?? `Could not export as ${format.toUpperCase()}`);
      return;
    }
    if (res.signedUrl) {
      window.open(res.signedUrl, "_blank", "noopener,noreferrer");
    }
    router.refresh();
  }

  function wordStats() {
    if (!editor) return { words: 0, chars: 0, pages: 1 };
    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    let pages = 1;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "pageBreak") pages += 1;
      return true;
    });
    return { words, chars, pages };
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Slim header — title, save state, primary actions */}
      <header className="flex items-center justify-between gap-4 border-b border-card-border bg-card-bg/40 px-4 py-1.5">
        <div className="min-w-0 flex items-center gap-3">
          <Link
            href={`/regwatch/documents/${documentId}`}
            className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            title="Back to document detail"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {documentTitle}
            </h1>
            {documentSubtitle && (
              <p className="truncate text-[10px] text-muted">{documentSubtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveStateBadge state={saveState} version={currentVersion} />
          <button
            type="button"
            onClick={() => setReferenceOpen((v) => !v)}
            title="Open a regulation alongside the editor"
            className={`rounded-md border px-3 py-1.5 text-xs ${
              referenceOpen
                ? "border-brand-teal bg-brand-teal/15 text-brand-teal"
                : "border-card-border bg-background text-foreground/90 hover:border-brand-teal hover:text-brand-teal"
            }`}
          >
            📖 Reference
          </button>
          <button
            type="button"
            onClick={() => {
              setCommitError(null);
              setSaveDialogOpen(true);
            }}
            disabled={!editor || saveState.type === "conflict"}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            Save version
          </button>
        </div>
      </header>

      {/* Google Docs-style menu bar */}
      <DocMenuBar
        editor={editor}
        documentId={documentId}
        onApplyTemplate={() => setTemplateDialogOpen(true)}
        onToggleReference={() => setReferenceOpen((v) => !v)}
        referenceOpen={referenceOpen}
        onToggleOutline={() => setOutlineOpen((v) => !v)}
        outlineOpen={outlineOpen}
        onToggleToolbar={() => setToolbarOpen((v) => !v)}
        toolbarOpen={toolbarOpen}
        onExport={handleExport}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onShowWordCount={() => setWordCountOpen(true)}
      />

      {saveState.type === "conflict" && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
          Another save landed on this document. To avoid overwriting their
          changes, reload the page —{" "}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="underline"
          >
            reload now
          </button>
          .
        </div>
      )}

      {exportError && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-[11px] text-red-300">
          Export failed: {exportError}{" "}
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="underline"
          >
            dismiss
          </button>
        </div>
      )}
      {exporting && (
        <div className="border-b border-brand-blue/40 bg-brand-blue/10 px-4 py-2 text-[11px] text-brand-blue">
          Exporting as {exporting.toUpperCase()}…
        </div>
      )}

      {toolbarOpen && <EditorToolbar editor={editor} />}

      <div className="flex min-h-0 flex-1">
        {outlineOpen && (
          <DocSectionNav
            editor={editor}
            onClose={() => setOutlineOpen(false)}
          />
        )}
        {referenceOpen && (
          <EditorReferencePane onClose={() => setReferenceOpen(false)} />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0a0e1a] py-8">
          <div className="mx-auto max-w-[8.5in]">
            <EditorContent editor={editor} />
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={appendNewPage}
                disabled={!editor}
                title="Append a new blank page at the end of the document. To insert a page between existing pages, place your cursor where you want the break and use Insert ▾ → Page break (or ⌘↩)."
                className="rounded-md border border-dashed border-card-border bg-card-bg/30 px-4 py-2 text-xs text-muted hover:border-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal disabled:opacity-50"
              >
                + New page
              </button>
            </div>
          </div>
        </div>
      </div>

      <SaveVersionDialog
        open={saveDialogOpen}
        onClose={() => {
          if (!commitPending) setSaveDialogOpen(false);
        }}
        currentVersion={currentVersion}
        pending={commitPending}
        errorMessage={commitError}
        onSubmit={handleCommit}
      />

      <ApplyTemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        hasExistingContent={hasExistingContent()}
        onApply={handleApplyTemplate}
      />

      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
        size="md"
      >
        <table className="w-full text-xs">
          <tbody className="divide-y divide-card-border">
            {[
              ["Bold", "⌘B"],
              ["Italic", "⌘I"],
              ["Underline", "⌘U"],
              ["Undo", "⌘Z"],
              ["Redo", "⇧⌘Z"],
              ["Select all", "⌘A"],
              ["Insert page break", "⌘↩"],
              ["Print", "⌘P"],
            ].map(([label, k]) => (
              <tr key={label}>
                <td className="py-1.5 text-foreground/90">{label}</td>
                <td className="py-1.5 text-right font-mono text-muted">{k}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      <Modal
        open={wordCountOpen}
        onClose={() => setWordCountOpen(false)}
        title="Document statistics"
        size="sm"
      >
        {(() => {
          const s = wordStats();
          return (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted">Pages</dt>
              <dd className="text-right font-mono text-foreground">{s.pages}</dd>
              <dt className="text-muted">Words</dt>
              <dd className="text-right font-mono text-foreground">{s.words}</dd>
              <dt className="text-muted">Characters</dt>
              <dd className="text-right font-mono text-foreground">{s.chars}</dd>
            </dl>
          );
        })()}
      </Modal>
    </div>
  );
}

function SaveStateBadge({
  state,
  version,
}: {
  state: SaveState;
  version: SemVer | null;
}) {
  const versionLabel = version ? formatVersion(version) : "draft";
  let label: string;
  let tone: string;
  switch (state.type) {
    case "idle":
      label = version ? `Current: ${versionLabel}` : "Unsaved draft";
      tone = "text-muted";
      break;
    case "saving":
      label = "Autosaving…";
      tone = "text-brand-blue";
      break;
    case "saved":
      label = "Autosaved";
      tone = "text-brand-teal";
      break;
    case "conflict":
      label = "Conflict — reload";
      tone = "text-amber-300";
      break;
    case "error":
      label = state.message;
      tone = "text-red-300";
      break;
  }
  return <span className={`text-[11px] ${tone}`}>{label}</span>;
}
