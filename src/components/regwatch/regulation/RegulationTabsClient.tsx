"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RegulationOriginalPane } from "./RegulationOriginalPane";
import { RegulationTranslationPane } from "./RegulationTranslationPane";

interface Props {
  regId: string;
  sourceUrl: string | null;
  hasCached: boolean;
  /** ISO 639-1 language code of the source regulation. When != 'en'
   *  the English-translation tab is shown. */
  sourceLanguage: string;
  /** Pre-rendered Articles tab content (the existing extracted body). */
  articlesContent: React.ReactNode;
}

type TabKey = "articles" | "original" | "translation";

const KNOWN_LANGS = new Set(["ar", "fr", "es", "zh", "de"]);

/**
 * Articles ↔ Original ↔ English tab switcher for the regulation reader.
 *
 * Articles tab: extracted body (server-rendered, passed in as children).
 * Original tab: cached source PDF / HTML via RegulationOriginalPane.
 * English tab (conditional): machine translation via Claude — only
 *   shown when the source language isn't English. Contains a prominent
 *   bolded legal disclaimer at the top.
 *
 * Switching tabs doesn't unmount the others — keeps DOM stable so the
 * sidebar's sticky positioning + Iris widget context don't flicker.
 */
export function RegulationTabsClient({
  regId,
  sourceUrl,
  hasCached,
  sourceLanguage,
  articlesContent,
}: Props) {
  const t = useTranslations("regwatch.discover");
  const [tab, setTab] = useState<TabKey>("articles");
  const showTranslation = sourceLanguage !== "en";
  const sourceLabel = KNOWN_LANGS.has(sourceLanguage)
    ? t(`lang.${sourceLanguage}`)
    : sourceLanguage.toUpperCase();

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 border-b border-card-border">
        <TabButton
          active={tab === "articles"}
          onClick={() => setTab("articles")}
          label={t("tabArticles")}
          subtitle={t("tabArticlesSubtitle")}
        />
        <TabButton
          active={tab === "original"}
          onClick={() => setTab("original")}
          label={t("tabOriginal")}
          subtitle={
            showTranslation
              ? t("tabOriginalSourceLang", { lang: sourceLabel })
              : hasCached
              ? t("tabOriginalCached")
              : t("tabOriginalFromPublisher")
          }
          highlight={hasCached}
        />
        {showTranslation && (
          <TabButton
            active={tab === "translation"}
            onClick={() => setTab("translation")}
            label={t("tabEnglish")}
            subtitle={t("tabEnglishSubtitle", { lang: sourceLabel })}
            highlight
          />
        )}
        <span className="ms-auto pb-1 text-[10px] text-muted">
          {showTranslation
            ? t("tabHintTranslated")
            : t("tabHintExtracted")}
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
      {showTranslation && (
        <div className={tab === "translation" ? "block" : "hidden"}>
          <RegulationTranslationPane regId={regId} sourceLang={sourceLanguage} />
        </div>
      )}
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
      className={`-mb-px border-b-2 px-4 py-2 text-start text-xs transition ${
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
