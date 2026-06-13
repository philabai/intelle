"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { linkDocumentToRegulation } from "@/lib/regwatch/internal-documents-actions";
import { getRegulationBody } from "@/lib/regwatch/regulation-body-actions";
import type {
  BodyParagraph,
  InternalDocBody,
} from "@/lib/regwatch/internal-document-body-actions";
import { normaliseAnchorKey } from "@/lib/regwatch/paragraph-split";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";
import { CrosswalkParagraphPane } from "./CrosswalkParagraphPane";
import type { MappedRow } from "./MappedBadge";

interface ExistingLink {
  id: string;
  regulatoryItemId: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  clauseAnchor: string | null;
  internalClauseAnchor: string | null;
  linkRationale: string | null;
  supersededAt: string | null;
}

interface Props {
  documentId: string;
  documentTitle: string;
  documentSubtitle: string;
  internalBody: InternalDocBody;
  existingLinks: ExistingLink[];
}

/**
 * Side-by-side clause crosswalk workspace.
 *
 *   - Left pane: this document's text, paragraph-by-paragraph, with
 *     "Use this section" buttons. Free-text fallback when extraction is thin.
 *   - Right pane: inline regulation picker at top; once picked, the
 *     regulation's body renders below with "Use this clause" buttons.
 *   - Sticky footer collects the selected pair (your section + regulation
 *     clause + rationale) and saves one crosswalk row per Save.
 *
 * Pattern lifted from Veeva Vault QualityDocs, AuditBoard CrossComply
 * Requirement Traceability Matrix, and Drata/Vanta SOC2 crosswalks.
 */
export function ClauseCrosswalkWorkspace({
  documentId,
  documentTitle,
  documentSubtitle,
  internalBody,
  existingLinks,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Right pane state — regulation picker + lazy-loaded body
  const [regulation, setRegulation] = useState<RegulationPickerResult | null>(
    null,
  );
  const [regulationBody, setRegulationBody] = useState<{
    paragraphs: BodyParagraph[];
    sourceUrl: string;
    summaryOnly: boolean;
  } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);

  // Footer pair state
  const [internalAnchor, setInternalAnchor] = useState("");
  const [internalText, setInternalText] = useState("");
  const [regulationAnchor, setRegulationAnchor] = useState("");
  const [regulationText, setRegulationText] = useState("");
  const [rationale, setRationale] = useState("");

  // Lazy load the regulation body when the user picks one
  useEffect(() => {
    if (!regulation) {
      setRegulationBody(null);
      return;
    }
    let cancelled = false;
    setBodyLoading(true);
    setBodyError(null);
    setRegulationBody(null);
    (async () => {
      const body = await getRegulationBody({ id: regulation.id });
      if (cancelled) return;
      if (!body) {
        setBodyError(
          "Could not load the regulation body — try opening the source link.",
        );
        setBodyLoading(false);
        return;
      }
      setRegulationBody({
        paragraphs: body.paragraphs,
        sourceUrl: body.sourceUrl,
        summaryOnly: body.summaryOnly,
      });
      setBodyLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [regulation]);

  // Build mapped-already lookup maps.
  // Left side keys are internal anchors. Right side keys are
  // `${regId}::${clauseAnchor}` so a clause anchor only highlights when the
  // currently-picked regulation matches.
  const activeLinks = useMemo(
    () => existingLinks.filter((l) => !l.supersededAt),
    [existingLinks],
  );

  // Match-number assignment — when a regulation is picked, every
  // crosswalk pair (both anchors set) involving that regulation gets a
  // stable sequential number. The same number appears on both panes for
  // a given pair, making the section ↔ clause pairing visually obvious.
  const matchNumberByLinkId = useMemo(() => {
    const map = new Map<string, number>();
    if (!regulation) return map;
    // Stable order: sort by link.id lexicographic so numbering doesn't
    // jitter when React re-renders.
    const relevant = activeLinks
      .filter(
        (l) =>
          l.regulatoryItemId === regulation.id &&
          !!l.clauseAnchor?.trim() &&
          !!l.internalClauseAnchor?.trim(),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    relevant.forEach((l, idx) => map.set(l.id, idx + 1));
    return map;
  }, [activeLinks, regulation]);

  const mappingsByInternalKey = useMemo(() => {
    const m = new Map<string, MappedRow[]>();
    for (const l of activeLinks) {
      const key = normaliseAnchorKey(l.internalClauseAnchor);
      if (!key) continue;
      const row: MappedRow = {
        id: l.id,
        regulationCitation: l.regulationCitation,
        regulationTitle: l.regulationTitle,
        jurisdictionCode: l.jurisdictionCode,
        clauseAnchor: l.clauseAnchor,
        internalClauseAnchor: l.internalClauseAnchor,
        linkRationale: l.linkRationale,
        matchNumber: matchNumberByLinkId.get(l.id),
      };
      const arr = m.get(key) ?? [];
      arr.push(row);
      m.set(key, arr);
    }
    // Keep chips in numeric order within each paragraph for readability.
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
    }
    return m;
  }, [activeLinks, matchNumberByLinkId]);

  const mappingsByRegulationKey = useMemo(() => {
    const m = new Map<string, MappedRow[]>();
    if (!regulation) return m;
    for (const l of activeLinks) {
      if (l.regulatoryItemId !== regulation.id) continue;
      const key = normaliseAnchorKey(l.clauseAnchor);
      if (!key) continue;
      const row: MappedRow = {
        id: l.id,
        regulationCitation: l.regulationCitation,
        regulationTitle: l.regulationTitle,
        jurisdictionCode: l.jurisdictionCode,
        clauseAnchor: l.clauseAnchor,
        internalClauseAnchor: l.internalClauseAnchor,
        linkRationale: l.linkRationale,
        matchNumber: matchNumberByLinkId.get(l.id),
      };
      const arr = m.get(key) ?? [];
      arr.push(row);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
    }
    return m;
  }, [activeLinks, regulation, matchNumberByLinkId]);

  function onPickInternal(anchor: string, text: string) {
    setInternalAnchor(anchor);
    setInternalText(text);
    setError(null);
    setSuccess(null);
  }

  function onPickRegulation(anchor: string, text: string) {
    setRegulationAnchor(anchor);
    setRegulationText(text);
    setError(null);
    setSuccess(null);
  }

  function clearPair() {
    setInternalAnchor("");
    setInternalText("");
    setRegulationAnchor("");
    setRegulationText("");
    setRationale("");
    setError(null);
    setSuccess(null);
  }

  function onSave() {
    setError(null);
    setSuccess(null);
    if (!regulation) {
      setError("Pick a regulation on the right first.");
      return;
    }
    if (!internalAnchor.trim()) {
      setError("Pick or type a section from your document on the left.");
      return;
    }
    if (!regulationAnchor.trim()) {
      setError("Pick or type a clause from the regulation on the right.");
      return;
    }
    startTransition(async () => {
      const effectiveRationale =
        rationale.trim().length > 0
          ? rationale.trim()
          : regulationText.trim().length > 0
            ? regulationText.trim().slice(0, 800)
            : null;
      const res = await linkDocumentToRegulation({
        internalDocumentId: documentId,
        regulatoryItemId: regulation.id,
        clauseAnchor: regulationAnchor.trim(),
        internalClauseAnchor: internalAnchor.trim(),
        linkRationale: effectiveRationale,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save mapping.");
        return;
      }
      setSuccess(
        `Mapped ${internalAnchor.trim()} ↔ ${regulationAnchor.trim()}. Saved.`,
      );
      clearPair();
      router.refresh();
    });
  }

  const showFallback = !internalBody.usableForMapping;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-card-border bg-card-bg/30 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
            Clause crosswalk workspace
          </p>
          <h1 className="truncate text-sm font-semibold text-foreground">
            {documentTitle}
          </h1>
          {documentSubtitle && (
            <p className="truncate text-[11px] text-muted">{documentSubtitle}</p>
          )}
        </div>
        <Link
          href={`/regwatch/documents/${documentId}`}
          className="shrink-0 rounded-md border border-card-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/90 hover:border-brand-blue hover:text-brand-blue"
        >
          ← Done
        </Link>
      </header>

      {/* Two-pane body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Left pane — your document */}
        <section className="flex min-h-0 flex-col border-b border-card-border lg:border-b-0 lg:border-r">
          <div className="border-b border-card-border bg-card-bg/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Your document
            </p>
            <p className="truncate text-xs text-foreground">
              {internalBody.fileName ?? internalBody.title}
            </p>
          </div>
          {showFallback ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                {internalBody.fallbackReason ??
                  "Couldn't parse the document for inline picking."}
              </div>
              <label className="block">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Type your section anchor
                </span>
                <input
                  value={internalAnchor}
                  onChange={(e) => {
                    setInternalAnchor(e.target.value);
                    setInternalText("");
                  }}
                  placeholder="e.g. §4.2, Step 7, Section 3, Annex B"
                  className="mt-1 w-full rounded-md border border-card-border bg-card-bg/40 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
                />
              </label>
              <p className="mt-2 text-[11px] text-muted">
                Type whichever anchor your document uses. The right side still
                works normally — once you pick a regulation clause and click
                Save, the row is created with both anchors.
              </p>
            </div>
          ) : (
            <CrosswalkParagraphPane
              paragraphs={internalBody.paragraphs}
              mappingsByKey={mappingsByInternalKey}
              pickLabel="Use this section"
              side="internal"
              activeAnchor={internalAnchor || null}
              onPick={onPickInternal}
              emptyState={
                <p className="text-xs text-muted">
                  No paragraphs extracted from this document.
                </p>
              }
            />
          )}
        </section>

        {/* Right pane — regulation */}
        <section className="flex min-h-0 flex-col">
          <div className="space-y-2 border-b border-card-border bg-card-bg/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Regulation
            </p>
            <RegulationPicker
              value={regulation}
              onChange={(r) => {
                setRegulation(r);
                setRegulationAnchor("");
                setRegulationText("");
              }}
              showClauseField={false}
              placeholder="Search regulations to crosswalk against…"
            />
          </div>
          {!regulation ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted">
              Pick a regulation above to see its clauses and map them to your
              document.
            </div>
          ) : bodyLoading ? (
            <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted">
              Loading regulation body…
            </div>
          ) : bodyError ? (
            <div className="flex-1 overflow-auto p-4">
              <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-300">
                {bodyError}
              </p>
            </div>
          ) : regulationBody ? (
            <CrosswalkParagraphPane
              paragraphs={regulationBody.paragraphs}
              mappingsByKey={mappingsByRegulationKey}
              pickLabel="Use this clause"
              side="regulation"
              activeAnchor={regulationAnchor || null}
              onPick={onPickRegulation}
              emptyState={
                <div className="text-xs text-muted">
                  <p>No body text on file for this regulation yet.</p>
                  {regulationBody.sourceUrl && (
                    <p className="mt-2">
                      <a
                        href={regulationBody.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-blue hover:underline"
                      >
                        Open the source ↗
                      </a>{" "}
                      and type the clause anchor manually below.
                    </p>
                  )}
                </div>
              }
            />
          ) : null}
        </section>
      </div>

      {/* Sticky footer — selected pair */}
      <footer className="border-t border-card-border bg-card-bg/50 px-4 py-3">
        <div className="mx-auto grid max-w-[1600px] gap-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="rounded-md border border-card-border bg-background p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Your section
            </p>
            <input
              value={internalAnchor}
              onChange={(e) => setInternalAnchor(e.target.value)}
              placeholder="Pick on the left, or type"
              className="mt-1 w-full bg-transparent text-xs text-foreground placeholder:text-muted/60 focus:outline-none"
            />
            {internalText && (
              <p className="mt-1 line-clamp-2 text-[10px] text-muted">
                {internalText}
              </p>
            )}
          </div>
          <div className="rounded-md border border-card-border bg-background p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Regulation clause
            </p>
            <input
              value={regulationAnchor}
              onChange={(e) => setRegulationAnchor(e.target.value)}
              placeholder="Pick on the right, or type"
              className="mt-1 w-full bg-transparent text-xs text-foreground placeholder:text-muted/60 focus:outline-none"
            />
            {regulationText && (
              <p className="mt-1 line-clamp-2 text-[10px] text-muted">
                {regulationText}
              </p>
            )}
          </div>
          <div className="rounded-md border border-card-border bg-background p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Rationale (optional)
            </p>
            <input
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why these match — auditors read this"
              className="mt-1 w-full bg-transparent text-xs text-foreground placeholder:text-muted/60 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearPair}
              disabled={pending}
              className="rounded-md border border-card-border px-3 py-1.5 text-xs text-muted hover:border-card-border/80 hover:text-foreground disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !regulation}
              className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save mapping"}
            </button>
          </div>
        </div>
        {(error || success) && (
          <div className="mx-auto mt-2 max-w-[1600px]">
            {error && (
              <p className="text-[11px] text-red-300">{error}</p>
            )}
            {success && (
              <p className="text-[11px] text-brand-teal">{success}</p>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
