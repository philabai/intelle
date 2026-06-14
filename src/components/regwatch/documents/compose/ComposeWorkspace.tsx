"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "@/i18n/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  commitDocumentRevision,
  updateDocumentDraftBody,
} from "@/lib/regwatch/internal-document-revision-actions";
import { prepareCitedClause } from "@/lib/regwatch/internal-document-compose-actions";
import {
  formatVersion,
  type SemVer,
  type VersionBump,
} from "@/lib/regwatch/templates/version";
import { sanitiseBodyDoc } from "@/lib/regwatch/templates/sanitise-body-doc";
import { EDITOR_EXTENSIONS } from "@/components/regwatch/documents/editor/extensions";
import { EditorToolbar } from "@/components/regwatch/documents/editor/EditorToolbar";
import { SaveVersionDialog } from "@/components/regwatch/documents/editor/SaveVersionDialog";
import { ComposeReferencePane } from "./ComposeReferencePane";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";

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

/**
 * Compose workspace — same TipTap editor as /edit but in a split layout
 * with a regulation reference reader on the left. Click "Cite this
 * clause" on a paragraph in the reference → server validates the
 * (regId, anchor, displayText) triple and pins the regulation's current
 * last_changed_at, then a `citedClause` pill is inserted at the editor's
 * cursor. PR-6's supersession cron will flag pills whose pinned version
 * falls behind the regulation's latest.
 */
export function ComposeWorkspace({
  documentId,
  documentTitle,
  documentSubtitle,
  initialBodyDoc,
  initialUpdatedAt,
  currentVersion,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ type: "idle" });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [citeError, setCiteError] = useState<string | null>(null);
  // Right-pane document zoom (0.6–2.0). CSS `zoom` keeps ProseMirror's
  // click/caret mapping correct in Chromium and grows scrollHeight so the
  // zoomed page still scrolls.
  const [zoom, setZoom] = useState(1);
  const adjustZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(2, Math.max(0.6, Math.round((z + delta) * 100) / 100)));
  }, []);
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
        message: res.error ?? t("autosaveFailed"),
      });
      return;
    }
    lastSavedDocRef.current = serialised;
    if (res.newUpdatedAt) {
      expectedUpdatedAtRef.current = res.newUpdatedAt;
    }
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
        setCommitError(t("conflictReloadMerge"));
        setSaveState({ type: "conflict" });
        return;
      }
      setCommitError(res.error ?? t("couldNotSaveVersion"));
      return;
    }
    setSaveDialogOpen(false);
    lastSavedDocRef.current = JSON.stringify(bodyDoc);
    if (res.newUpdatedAt) {
      expectedUpdatedAtRef.current = res.newUpdatedAt;
    }
    setSaveState({ type: "saved", at: Date.now() });
    router.refresh();
  }

  async function handleCite(params: {
    regulation: RegulationPickerResult;
    clauseAnchor: string;
    clauseText: string;
  }) {
    if (!editor) return;
    setCiteError(null);
    const res = await prepareCitedClause({
      regulatoryItemId: params.regulation.id,
      clauseAnchor: params.clauseAnchor,
    });
    if (!res.ok || !res.payload) {
      setCiteError(res.error ?? t("couldNotCiteClause"));
      return;
    }
    editor.chain().insertCitedClause(res.payload).run();
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card-bg/40 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/regwatch/documents/${documentId}`}
            className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            title={t("backToDetail")}
          >
            ←
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
              {t("composeWorkspace")}
            </p>
            <h1 className="truncate text-sm font-semibold text-foreground">
              {documentTitle}
            </h1>
            {documentSubtitle && (
              <p className="truncate text-[10px] text-muted">
                {documentSubtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveStateBadge state={saveState} version={currentVersion} />
          <Link
            href={`/regwatch/documents/${documentId}/edit`}
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-foreground/90 hover:border-brand-blue hover:text-brand-blue"
            title={t("switchToEditTitle")}
          >
            {t("switchToEdit")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setCommitError(null);
              setSaveDialogOpen(true);
            }}
            disabled={!editor || saveState.type === "conflict"}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {t("saveVersion")}
          </button>
        </div>
      </header>

      {saveState.type === "conflict" && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
          {t.rich("conflictBanner", {
            reload: (chunks) => (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="underline"
              >
                {chunks}
              </button>
            ),
          })}
        </div>
      )}

      {citeError && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-[11px] text-red-300">
          {citeError}{" "}
          <button
            type="button"
            onClick={() => setCiteError(null)}
            className="underline"
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      <EditorToolbar editor={editor} />

      {/* Split layout */}
      <div className="min-h-0 flex-1">
        <Group orientation="horizontal" id="compose-workspace">
          <Panel defaultSize={42} minSize={25} className="bg-card-bg/10">
            <ComposeReferencePane onCite={handleCite} />
          </Panel>
          <Separator className="w-1 bg-card-border hover:bg-brand-blue/50" />
          <Panel defaultSize={58} minSize={35}>
            <div className="flex h-full flex-col">
              {/* Document zoom controls (kept outside the zoomed content). */}
              <div className="flex items-center justify-end gap-1 border-b border-card-border bg-card-bg/30 px-3 py-1">
                <span className="me-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  {t("documentZoomLabel")}
                </span>
                <button
                  type="button"
                  onClick={() => adjustZoom(-0.1)}
                  disabled={zoom <= 0.6}
                  title={t("zoomOut")}
                  aria-label={t("zoomOut")}
                  className="rounded border border-card-border bg-background px-2 py-0.5 text-sm leading-none text-foreground/90 hover:border-brand-blue hover:text-brand-blue disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title={t("resetZoom")}
                  className="rounded border border-card-border bg-background px-2 py-0.5 text-[11px] tabular-nums text-foreground/90 hover:border-brand-blue hover:text-brand-blue"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => adjustZoom(0.1)}
                  disabled={zoom >= 2}
                  title={t("zoomIn")}
                  aria-label={t("zoomIn")}
                  className="rounded border border-card-border bg-background px-2 py-0.5 text-sm leading-none text-foreground/90 hover:border-brand-blue hover:text-brand-blue disabled:opacity-40"
                >
                  +
                </button>
              </div>
              {/* Scrollable document — overflow-auto so a zoomed-in page scrolls both ways. */}
              <div className="min-h-0 flex-1 overflow-auto bg-[#0a0e1a] py-8">
                <div
                  className="mx-auto max-w-[8.5in] px-6"
                  style={{ zoom } as CSSProperties}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </Panel>
        </Group>
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
  const t = useTranslations("regwatch.documents");
  const versionLabel = version ? formatVersion(version) : "draft";
  let label: string;
  let tone: string;
  switch (state.type) {
    case "idle":
      label = version
        ? t("currentVersion", { version: versionLabel })
        : t("unsavedDraft");
      tone = "text-muted";
      break;
    case "saving":
      label = t("autosaving");
      tone = "text-brand-blue";
      break;
    case "saved":
      label = t("autosaved");
      tone = "text-brand-teal";
      break;
    case "conflict":
      label = t("conflictReload");
      tone = "text-amber-300";
      break;
    case "error":
      label = state.message;
      tone = "text-red-300";
      break;
  }
  return <span className={`text-[11px] ${tone}`}>{label}</span>;
}
