"use client";

import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  commitDocumentRevision,
  updateDocumentDraftBody,
} from "@/lib/regwatch/internal-document-revision-actions";
import {
  formatVersion,
  type SemVer,
  type VersionBump,
} from "@/lib/regwatch/templates/version";
import { EDITOR_EXTENSIONS } from "./extensions";
import { EditorToolbar } from "./EditorToolbar";
import { SaveVersionDialog } from "./SaveVersionDialog";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";
import { EditorReferencePane } from "./EditorReferencePane";

interface Props {
  documentId: string;
  documentTitle: string;
  documentSubtitle: string;
  /** Initial ProseMirror JSON; null when the doc has no body yet (first edit). */
  initialBodyDoc: unknown;
  /** Snapshot of updated_at at server render time — drives the optimistic lock. */
  initialUpdatedAt: string;
  /** Last committed semver, null for never-committed docs. */
  currentVersion: SemVer | null;
}

type SaveState =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "saved"; at: number }
  | { type: "conflict" }
  | { type: "error"; message: string };

const AUTOSAVE_DEBOUNCE_MS = 3_000;

/**
 * Hybrid-strategy "Edit document" surface.
 *
 *   - Page-frame layout: dark workspace canvas + raised "paper" page so the
 *     editor feels like a Word document, not a transparent overlay.
 *   - Autosave (3s debounce) writes the live PM JSON to
 *     internal_documents.body_doc only. No revision is created.
 *   - "Save version" opens a modal that takes a major/minor/patch + reason
 *     for change, then calls commitDocumentRevision to write an immutable
 *     revision and advance current_revision_id.
 *   - "Apply template" button drops a curated template structure into the
 *     editor (replaces body; existing committed versions stay).
 *   - "📖 Reference" toggle opens a slim regulation reader on the left so
 *     authors can read while writing (click-to-cite lands in PR-5).
 *
 * Optimistic lock: the server checks the doc's updated_at against the
 * expectedUpdatedAt we send. If they diverge, the editor surfaces a
 * conflict banner and disables autosave until the user reloads.
 */
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
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const expectedUpdatedAtRef = useRef(initialUpdatedAt);
  const lastSavedDocRef = useRef<string>(JSON.stringify(initialBodyDoc ?? null));
  const autosaveTimerRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: initialBodyDoc ?? undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[calc(11in-6rem)] max-w-none text-[15px] leading-7 text-foreground focus:outline-none prose prose-invert max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-1 prose-p:my-2 prose-table:border prose-table:border-card-border prose-th:bg-card-bg/40 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-card-border",
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

  function handleApplyTemplate(templateBodyDoc: unknown, _templateLabel: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setContent(templateBodyDoc as Parameters<typeof editor.commands.setContent>[0])
      .run();
    setTemplateDialogOpen(false);
    // Force the autosave to fire on the next tick so the template lands in
    // body_doc even if the user doesn't immediately type.
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-card-border bg-card-bg/40 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
            Editing
          </p>
          <h1 className="truncate text-sm font-semibold text-foreground">
            {documentTitle}
          </h1>
          {documentSubtitle && (
            <p className="truncate text-[11px] text-muted">{documentSubtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SaveStateBadge state={saveState} version={currentVersion} />
          <button
            type="button"
            onClick={() => setTemplateDialogOpen(true)}
            disabled={!editor}
            title="Drop a curated section structure into this document (replaces current body)"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-foreground/90 hover:border-brand-teal hover:text-brand-teal disabled:opacity-50"
          >
            ➕ Apply template
          </button>
          <button
            type="button"
            onClick={() => setReferenceOpen((v) => !v)}
            title="Open a regulation alongside the editor so you can read while you write"
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
          <Link
            href={`/regwatch/documents/${documentId}`}
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-muted hover:border-brand-blue hover:text-foreground"
          >
            Done
          </Link>
        </div>
      </header>

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

      <EditorToolbar editor={editor} />

      <div className="flex min-h-0 flex-1">
        {referenceOpen && (
          <EditorReferencePane onClose={() => setReferenceOpen(false)} />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0a0e1a]">
          <div className="mx-auto my-8 max-w-[8.5in] rounded-md border border-card-border bg-[#1a1f2e] shadow-2xl shadow-black/40">
            <div className="px-[1in] py-[0.85in]">
              <EditorContent editor={editor} />
            </div>
          </div>
          <p className="mb-8 text-center text-[10px] text-muted">
            — End of page —
          </p>
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
