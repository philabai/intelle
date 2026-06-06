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
 *   - Autosave (3s debounce) writes the live PM JSON to
 *     internal_documents.body_doc only. No revision is created.
 *   - "Save version" opens a modal that takes a major/minor/patch + reason
 *     for change, then calls commitDocumentRevision to write an immutable
 *     revision and advance current_revision_id.
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
          "min-h-[60vh] max-w-none px-8 py-6 text-sm leading-relaxed text-foreground focus:outline-none prose prose-sm prose-invert prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base prose-table:border prose-table:border-card-border prose-th:bg-card-bg/40 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-card-border",
      },
    },
    onUpdate: () => {
      scheduleAutosave();
    },
  });

  // Cleanup the autosave timer on unmount.
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
    // Flush any pending autosave before committing so the server has the
    // latest body_doc as the optimistic-lock baseline.
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
    // Refresh server data — updated_at moves on, so we need a new snapshot
    // for subsequent saves.
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-card-border bg-card-bg/30 px-4 py-2.5">
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

      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} />
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
