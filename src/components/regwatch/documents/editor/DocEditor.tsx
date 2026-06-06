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
import { ExportMenu } from "./ExportMenu";
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
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

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
  const [zoom, setZoom] = useState(1);
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

  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }
  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header — title + primary actions */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card-bg/40 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          <SaveStateBadge state={saveState} version={currentVersion} />
          <button
            type="button"
            onClick={() => setOutlineOpen((v) => !v)}
            title={outlineOpen ? "Hide outline" : "Show outline"}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              outlineOpen
                ? "border-brand-teal bg-brand-teal/15 text-brand-teal"
                : "border-card-border bg-background text-foreground/90 hover:border-brand-teal hover:text-brand-teal"
            }`}
          >
            📑 Outline
          </button>
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
            onClick={() => setTemplateDialogOpen(true)}
            disabled={!editor}
            title="Drop a curated section structure into this document"
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-foreground/90 hover:border-brand-teal hover:text-brand-teal disabled:opacity-50"
          >
            ➕ Apply template
          </button>
          <ExportMenu
            documentId={documentId}
            onBeforeExport={async () => {
              if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
              }
              await runAutosave();
            }}
          />
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

      {/* Toolbar with zoom group on the right */}
      <div className="flex items-center justify-between border-b border-card-border bg-card-bg/30">
        <div className="min-w-0 flex-1">
          <EditorToolbar editor={editor} />
        </div>
        <div className="shrink-0 px-3 py-2">
          <div className="inline-flex items-center overflow-hidden rounded-md border border-card-border bg-background">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out"
              className="px-2 py-1 text-xs text-foreground/90 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Reset zoom to 100%"
              className="border-x border-card-border px-2 py-1 font-mono text-[11px] text-foreground/90 hover:bg-card-bg"
            >
              {zoomPct}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              title="Zoom in"
              className="px-2 py-1 text-xs text-foreground/90 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      </div>

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
          <div
            className="mx-auto max-w-[8.5in]"
            // CSS `zoom` scales both layout dimensions and rendering, so the
            // scroll container expands naturally as the user zooms in.
            style={{ zoom }}
          >
            <EditorContent editor={editor} />
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={appendNewPage}
                disabled={!editor}
                title="Append a new blank page at the end of the document. To insert a page between existing pages, click an existing page break and press the ↵ Page break button."
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
