import type { Article, ArticlePillar } from "@/lib/types";
import { PILLARS } from "@/lib/content/pillars";
import { SITE } from "@/lib/constants";

const PILLAR_EYEBROW: Record<ArticlePillar, string> = {
  industry_insight: "INDUSTRY INSIGHT",
  service_spotlight: "SERVICE SPOTLIGHT",
  founder_pov: "FOUNDER POV",
  case_archetype: "CASE ARCHETYPE",
  resource: "RESOURCE",
};

function splitTitle(title: string): { first: string; second: string | null } {
  // Two-tone treatment: split on the last sentence-internal punctuation we find
  // (. or ? or :). If none, split at the last comma. If none, no split.
  const punct = [". ", "? ", ": ", ", "];
  for (const p of punct) {
    const idx = title.lastIndexOf(p);
    if (idx > 6 && idx < title.length - 4) {
      return {
        first: title.slice(0, idx + p.length).trimEnd(),
        second: title.slice(idx + p.length).trim(),
      };
    }
  }
  return { first: title, second: null };
}

export function HeroCard({ article }: { article: Article }) {
  const eyebrow = article.pillar
    ? PILLAR_EYEBROW[article.pillar]
    : article.category.replace("-", " ").toUpperCase();
  const { first, second } = splitTitle(article.title);
  const date = article.published_at
    ? new Date(article.published_at)
    : new Date(article.created_at);
  const year = date.getFullYear();

  return (
    <header className="rounded-2xl border-t-2 border-brand-teal bg-brand-navy text-white p-8 sm:p-10 mb-10 shadow-xl">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand-teal mb-4">
        {eyebrow}
      </p>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
        <span className="text-white">{first}</span>
        {second && (
          <>
            {" "}
            <span className="text-brand-blue">{second}</span>
          </>
        )}
      </h1>
      {article.excerpt && (
        <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
          {article.excerpt}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
        <span className="font-medium text-white/80">
          By {article.author_name}
          {article.author_name === SITE.name ? "" : ", Founder & CEO"}
        </span>
        <span>
          {SITE.name} · {date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} · Issue {year}
        </span>
      </div>
    </header>
  );
}
