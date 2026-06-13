"use client";

import { useEffect, useState } from "react";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";
import { getRegulationBody } from "@/lib/regwatch/regulation-body-actions";
import type { BodyParagraph } from "@/lib/regwatch/paragraph-split";

interface Props {
  onClose: () => void;
}

/**
 * Slim regulation-reference panel embedded next to the editor. Lets the
 * author keep a regulation open on the left while typing on the right —
 * the "Google Docs research pane" pattern.
 *
 * v1 is read-only: no click-to-insert. That's the Compose workspace (PR-5);
 * once it lands, this pane will gain "Insert as cited clause" buttons.
 */
export function EditorReferencePane({ onClose }: Props) {
  const [regulation, setRegulation] = useState<RegulationPickerResult | null>(null);
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
        setError("Could not load this regulation. Try opening its source link.");
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

  return (
    <aside className="flex w-full min-w-0 flex-col border-e border-card-border bg-card-bg/20 lg:w-2/5">
      <div className="flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/40 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
          Reference
        </p>
        <button
          type="button"
          onClick={onClose}
          title="Close the reference pane"
          className="rounded-md border border-card-border bg-background px-2 py-1 text-[10px] text-muted hover:border-brand-blue hover:text-foreground"
        >
          ✕ Close
        </button>
      </div>

      <div className="border-b border-card-border bg-card-bg/30 p-3">
        <RegulationPicker
          value={regulation}
          onChange={setRegulation}
          showClauseField={false}
          placeholder="Pick a regulation to keep open while you write…"
        />
        {regulation && body?.sourceUrl && (
          <p className="mt-1 text-[10px] text-muted">
            <a
              href={body.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-blue hover:underline"
            >
              Open source ↗
            </a>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!regulation ? (
          <p className="text-center text-xs text-muted">
            Pick a regulation above to read it side-by-side with your editor.
          </p>
        ) : loading ? (
          <p className="text-center text-xs text-muted">Loading body…</p>
        ) : error ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-300">
            {error}
          </p>
        ) : body && body.paragraphs.length === 0 ? (
          <p className="text-xs text-muted">
            No body text on file for this regulation yet. Use the source link
            above to read it directly.
          </p>
        ) : body ? (
          <ol className="space-y-2">
            {body.paragraphs.map((p) => (
              <li
                key={p.index}
                className="rounded-md border border-card-border bg-background/40 p-2"
              >
                {p.detectedAnchor && (
                  <p className="mb-0.5 font-mono text-[10px] font-semibold text-brand-teal">
                    {p.detectedAnchor}
                  </p>
                )}
                <p
                  className={`break-words text-[12px] leading-relaxed ${
                    p.isHeading ? "font-semibold text-foreground" : "text-foreground/85"
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
        Reference is read-only. Click-to-cite arrives with the Compose
        workspace.
      </div>
    </aside>
  );
}
