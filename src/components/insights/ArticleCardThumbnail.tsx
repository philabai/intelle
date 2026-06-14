import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Article, ArticlePillar } from "@/lib/types";

const PILLAR_EYEBROW_KEY: Record<ArticlePillar, string> = {
  industry_insight: "pillarEyebrowIndustryInsight",
  service_spotlight: "pillarEyebrowServiceSpotlight",
  founder_pov: "pillarEyebrowFounderPov",
  case_archetype: "pillarEyebrowCaseArchetype",
  resource: "pillarEyebrowResource",
};

const PILLAR_TAG_KEY: Record<ArticlePillar, string> = {
  industry_insight: "pillarTagIndustryInsight",
  service_spotlight: "pillarTagServiceSpotlight",
  founder_pov: "pillarTagFounderPov",
  case_archetype: "pillarTagCaseArchetype",
  resource: "pillarTagResource",
};

type Palette = { className: string; accent: string };

const PILLAR_PALETTE: Record<ArticlePillar, Palette> = {
  industry_insight: {
    className: "from-brand-navy via-brand-blue/60 to-brand-teal/40",
    accent: "text-brand-teal",
  },
  service_spotlight: {
    className: "from-brand-navy via-brand-blue to-brand-blue/30",
    accent: "text-brand-blue",
  },
  founder_pov: {
    className: "from-brand-navy via-brand-violet to-brand-blue/40",
    accent: "text-brand-violet",
  },
  case_archetype: {
    className: "from-brand-navy via-brand-violet/60 to-brand-teal/30",
    accent: "text-brand-teal",
  },
  resource: {
    className: "from-brand-navy via-brand-teal/70 to-brand-blue/50",
    accent: "text-brand-teal",
  },
};

const CATEGORY_PALETTE: Record<string, Palette> = {
  insight: PILLAR_PALETTE.industry_insight,
  "case-study": PILLAR_PALETTE.case_archetype,
  whitepaper: PILLAR_PALETTE.resource,
  news: {
    className: "from-brand-navy via-yellow-500/30 to-brand-blue/30",
    accent: "text-yellow-400",
  },
};

const CATEGORY_EYEBROW_KEY: Record<string, string> = {
  insight: "categoryEyebrowInsight",
  "case-study": "categoryEyebrowCaseStudy",
  whitepaper: "categoryEyebrowWhitepaper",
  news: "categoryEyebrowNews",
};

function HexPattern() {
  // Decorative hexagonal lattice — purely visual, intentionally subtle.
  return (
    <svg
      className="absolute -right-6 -top-6 h-44 w-44 opacity-10 text-white"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => {
          const cx = 12 + col * 24 + (row % 2) * 12;
          const cy = 12 + row * 21;
          const r = 11;
          const points = Array.from({ length: 6 }, (_, i) => {
            const ang = (Math.PI / 3) * i - Math.PI / 6;
            return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
          }).join(" ");
          return <polygon key={`${row}-${col}`} points={points} />;
        })
      )}
    </svg>
  );
}

export function ArticleCardThumbnail({ article }: { article: Article }) {
  const t = useTranslations("insightsUi");
  // 1. If a real cover image is set, render it.
  if (article.cover_image_url) {
    return (
      <div className="relative h-40 w-full overflow-hidden bg-brand-navy">
        <Image
          src={article.cover_image_url}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  // 2. Otherwise render a branded synthetic thumbnail — varied by pillar (or
  //    category if pillar is null) so cards do not all look identical.
  const palette =
    (article.pillar && PILLAR_PALETTE[article.pillar]) ||
    CATEGORY_PALETTE[article.category] ||
    PILLAR_PALETTE.industry_insight;

  const eyebrowKey =
    (article.pillar && PILLAR_EYEBROW_KEY[article.pillar]) ||
    CATEGORY_EYEBROW_KEY[article.category] ||
    "categoryEyebrowInsight";
  const eyebrow = t(eyebrowKey);

  const tagLine = article.pillar
    ? t(PILLAR_TAG_KEY[article.pillar])
    : article.category.replace("-", " ");

  return (
    <div
      className={`relative h-40 overflow-hidden bg-gradient-to-br ${palette.className}`}
    >
      <HexPattern />
      <div className="relative h-full flex flex-col justify-between p-5">
        <p className={`text-[10px] font-bold tracking-[0.2em] ${palette.accent}`}>
          {eyebrow}
        </p>
        <div>
          <p className="text-xl font-bold text-white leading-tight capitalize">
            {tagLine}
          </p>
          <p className="text-[11px] tracking-widest text-white/50 mt-1">
            intelle.io · ISSUE 01
          </p>
        </div>
      </div>
    </div>
  );
}
