import Link from "next/link";
import type { BriefingCitation } from "@/lib/regwatch/briefing";

interface Props {
  text: string;
  citations: BriefingCitation[];
}

/**
 * Renders a briefing paragraph and replaces inline [n] tokens with
 * hover-titled, click-to-detail citation anchors. Falls back to plain text
 * if a referenced citation index is out of range.
 */
export function BriefingBody({ text, citations }: Props) {
  if (!text) return null;
  const byIndex = new Map<number, BriefingCitation>(
    citations.map((c) => [c.index, c]),
  );
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
      {parts.map((p, idx) => {
        const m = p.match(/^\[(\d+)\]$/);
        if (!m) return <span key={idx}>{p}</span>;
        const n = parseInt(m[1], 10);
        const c = byIndex.get(n);
        if (!c) return <span key={idx}>{p}</span>;
        const href = `/regwatch/r/${c.jurisdiction_code.toLowerCase()}/${c.slug}`;
        return (
          <Link
            key={idx}
            href={href}
            title={`${c.regulator} — ${c.citation}: ${c.title}`}
            className="inline-flex items-baseline rounded bg-brand-teal/15 px-1 py-0 font-mono text-[11px] font-semibold text-brand-teal no-underline hover:bg-brand-teal/30"
          >
            [{n}]
          </Link>
        );
      })}
    </p>
  );
}
