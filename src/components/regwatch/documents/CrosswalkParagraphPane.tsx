"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BodyParagraph } from "@/lib/regwatch/paragraph-split";
import { normaliseAnchorKey } from "@/lib/regwatch/paragraph-split";
import { MappedBadge, type MappedRow } from "./MappedBadge";

interface Props {
  paragraphs: BodyParagraph[];
  /** Map of normalised-anchor → mapping rows that touch that anchor. */
  mappingsByKey: Map<string, MappedRow[]>;
  /** "Use this section" / "Use this clause" button label. */
  pickLabel: string;
  /** What side we're rendering — used for the badge modal title. */
  side: "internal" | "regulation";
  /** Active anchor (highlighted in the list when set). */
  activeAnchor: string | null;
  onPick: (anchor: string, text: string) => void;
  /** Empty-state node when paragraphs is empty. */
  emptyState: React.ReactNode;
}

/**
 * Shared paragraph list renderer for both panes of the crosswalk workspace.
 * Search box at top, headings rail on the left, paragraph list on the right
 * with "Use this …" picker + mapped-already badges.
 */
export function CrosswalkParagraphPane({
  paragraphs,
  mappingsByKey,
  pickLabel,
  side,
  activeAnchor,
  onPick,
  emptyState,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const [search, setSearch] = useState("");

  const headings = useMemo(
    () => paragraphs.filter((p) => p.isHeading),
    [paragraphs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paragraphs;
    return paragraphs.filter(
      (p) =>
        p.text.toLowerCase().includes(q) ||
        (p.detectedAnchor?.toLowerCase().includes(q) ?? false),
    );
  }, [paragraphs, search]);

  function paragraphAnchor(p: BodyParagraph): string {
    return p.detectedAnchor ?? `¶${p.index}`;
  }

  /**
   * Lookup key MUST be derived from the same string that `paragraphAnchor`
   * emits, otherwise a paragraph without a detected anchor will save under
   * `¶12` but be looked up under `idx:12` — the badges then never appear
   * after save. We normalise the displayed anchor so it matches what the
   * save flow stores in `internal_clause_anchor`.
   */
  function paragraphKey(p: BodyParagraph): string {
    return (
      normaliseAnchorKey(paragraphAnchor(p)) ?? `idx:${p.index}`
    );
  }

  if (paragraphs.length === 0) {
    return <div className="flex-1 overflow-auto p-4">{emptyState}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-card-border px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchThisDocument")}
          className="w-full rounded-md border border-card-border bg-card-bg/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </div>
      <div className="flex min-h-0 flex-1">
        {headings.length > 0 && (
          <nav className="hidden w-40 shrink-0 overflow-y-auto border-e border-card-border bg-card-bg/20 py-2 text-[11px] md:block">
            {headings.map((h) => (
              <a
                key={h.index}
                href={`#para-${side}-${h.index}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(`para-${side}-${h.index}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="block truncate px-3 py-1 text-muted hover:bg-card-bg/60 hover:text-foreground"
                title={h.detectedAnchor ?? h.text}
              >
                {h.detectedAnchor ?? h.text.slice(0, 32)}
              </a>
            ))}
          </nav>
        )}
        <ol className="min-w-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <li className="rounded-md border border-dashed border-card-border p-4 text-center text-xs text-muted">
              {t("noParagraphsMatch", { search })}
            </li>
          ) : (
            filtered.map((p) => {
              const anchor = paragraphAnchor(p);
              const key = paragraphKey(p);
              const mapped = mappingsByKey.get(key) ?? [];
              const isActive = activeAnchor === anchor;
              return (
                <li
                  key={p.index}
                  id={`para-${side}-${p.index}`}
                  className={`group mb-2 rounded-md border p-2.5 text-xs ${
                    isActive
                      ? "border-brand-blue bg-brand-blue/10"
                      : "border-card-border bg-card-bg/30 hover:border-card-border/80 hover:bg-card-bg/50"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {p.detectedAnchor ? (
                      <span className="font-mono text-[10px] font-semibold text-brand-teal">
                        {p.detectedAnchor}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted">
                        ¶{p.index}
                      </span>
                    )}
                    <MappedBadge
                      count={mapped.length}
                      rows={mapped}
                      side={side}
                    />
                    <button
                      type="button"
                      onClick={() => onPick(anchor, p.text)}
                      className="ms-auto rounded-md border border-card-border bg-background px-2 py-1 text-[10px] font-medium text-foreground/90 opacity-100 transition hover:border-brand-blue hover:text-brand-blue focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      {pickLabel}
                    </button>
                  </div>
                  <p
                    className={`break-words text-[12px] leading-relaxed ${
                      p.isHeading
                        ? "font-semibold text-foreground"
                        : "text-foreground/85"
                    }`}
                  >
                    {p.text}
                  </p>
                </li>
              );
            })
          )}
        </ol>
      </div>
    </div>
  );
}
