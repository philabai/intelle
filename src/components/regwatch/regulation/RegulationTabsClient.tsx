"use client";

import { useState } from "react";
import { RegulationOriginalPane } from "./RegulationOriginalPane";

interface Props {
  regId: string;
  sourceUrl: string | null;
  hasCached: boolean;
  /** Pre-rendered Articles tab content (the existing extracted body). */
  articlesContent: React.ReactNode;
}

type TabKey = "articles" | "original";

/**
 * Articles ↔ Original tab switcher for the regulation reader.
 *
 * Articles tab: shows the extracted body (server-rendered, passed in
 *   as children so SEO + first-paint stay fast and identical to the
 *   prior detail page).
 * Original tab: lazy-loads the cached source PDF / HTML via the
 *   RegulationOriginalPane component (PR-D's main visible surface).
 *
 * Switching tabs doesn't unmount Articles — keeps DOM stable so the
 * sidebar's sticky positioning + Iris widget context don't flicker.
 */
export function RegulationTabsClient({
  regId,
  sourceUrl,
  hasCached,
  articlesContent,
}: Props) {
  const [tab, setTab] = useState<TabKey>("articles");
  return (
    <div>
      <div className="mb-4 flex items-center gap-1 border-b border-card-border">
        <TabButton
          active={tab === "articles"}
          onClick={() => setTab("articles")}
          label="Articles"
          subtitle="Extracted body"
        />
        <TabButton
          active={tab === "original"}
          onClick={() => setTab("original")}
          label="Original"
          subtitle={hasCached ? "Cached source" : "From publisher"}
          highlight={hasCached}
        />
        <span className="ml-auto pb-1 text-[10px] text-muted">
          Extracted view for reading · Original for compliance evidence
        </span>
      </div>

      <div className={tab === "articles" ? "block" : "hidden"}>
        {articlesContent}
      </div>
      <div className={tab === "original" ? "block" : "hidden"}>
        <RegulationOriginalPane
          regId={regId}
          sourceUrl={sourceUrl}
          hasCached={hasCached}
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  subtitle,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-left text-xs transition ${
        active
          ? "border-brand-blue text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div
        className={`text-[10px] ${
          active
            ? highlight
              ? "text-brand-teal"
              : "text-muted"
            : "text-muted/70"
        }`}
      >
        {subtitle}
      </div>
    </button>
  );
}
