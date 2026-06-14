"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";
import { getRegulationBody } from "@/lib/regwatch/regulation-body-actions";
import type { BodyParagraph } from "@/lib/regwatch/paragraph-split";

interface Props {
  /** Called when the user picks a clause to cite. */
  onCite: (params: {
    regulation: RegulationPickerResult;
    clauseAnchor: string;
    clauseText: string;
  }) => void;
}

/**
 * Left-pane reference reader. Same shape as EditorReferencePane (the
 * read-only side panel on /edit) but each paragraph here has a
 * "Cite this clause" affordance that inserts a citedClause pill into
 * the editor on the right.
 */
export function ComposeReferencePane({ onCite }: Props) {
  const t = useTranslations("regwatch.documents");
  const [regulation, setRegulation] = useState<RegulationPickerResult | null>(
    null,
  );
  const [body, setBody] = useState<{
    paragraphs: BodyParagraph[];
    sourceUrl: string;
    summaryOnly: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regulation) {
      setBody(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBody(null);
    (async () => {
      const r = await getRegulationBody({ id: regulation.id });
      if (cancelled) return;
      if (!r) {
        setError(t("regulationLoadFailed"));
        setLoading(false);
        return;
      }
      setBody({
        paragraphs: r.paragraphs,
        sourceUrl: r.sourceUrl,
        summaryOnly: r.summaryOnly,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [regulation]);

  function paragraphAnchor(p: BodyParagraph): string {
    return p.detectedAnchor ?? `¶${p.index}`;
  }

  function handleCite(p: BodyParagraph) {
    if (!regulation) return;
    onCite({
      regulation,
      clauseAnchor: paragraphAnchor(p),
      clauseText: p.text,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-card-border bg-card-bg/40 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
          {t("reference")}
        </p>
      </div>
      <div className="border-b border-card-border bg-card-bg/30 p-3">
        <RegulationPicker
          value={regulation}
          onChange={setRegulation}
          showClauseField={false}
          placeholder={t("composePickerPlaceholder")}
        />
        {regulation && body?.sourceUrl && (
          <p className="mt-1 text-[10px] text-muted">
            <a
              href={body.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-blue hover:underline"
            >
              {t("openSource")}
            </a>
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!regulation ? (
          <p className="text-center text-xs text-muted">
            {t("pickRegulationSideBySide")}
          </p>
        ) : loading ? (
          <p className="text-center text-xs text-muted">{t("loadingBody")}</p>
        ) : error ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-300">
            {error}
          </p>
        ) : body && body.paragraphs.length === 0 ? (
          <p className="text-xs text-muted">
            {t("noBodyTextUseSource")}
          </p>
        ) : body ? (
          <ol className="space-y-2">
            {body.paragraphs.map((p) => (
              <li
                key={p.index}
                className="group rounded-md border border-card-border bg-background/40 p-2"
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
                  <button
                    type="button"
                    onClick={() => handleCite(p)}
                    title={t("citeClauseTitle")}
                    className="ms-auto rounded-md border border-card-border bg-background px-2 py-1 text-[10px] font-medium text-foreground/90 opacity-100 transition hover:border-brand-teal hover:text-brand-teal focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    🔗 {t("citeThisClause")}
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
            ))}
          </ol>
        ) : null}
      </div>
      <div className="border-t border-card-border bg-card-bg/40 px-3 py-2 text-[10px] text-muted">
        {t("composeReferenceFooter")}
      </div>
    </div>
  );
}
