import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getSectionById,
  getEcfrSectionExcerpt,
} from "@/lib/regwatch/section-summary";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tm = await getTranslations("metadataRw");
  const section = await getSectionById(id);
  if (!section) return { title: tm("section.notFound") };
  const name = [section.identifier, section.title].filter(Boolean).join(" — ");
  return {
    title: `${name} — Vantage`,
    description: section.title ?? undefined,
  };
}

export default async function SectionDetailPage({ params }: Props) {
  const t = await getTranslations("regwatch.section");
  const { id } = await params;
  const section = await getSectionById(id);
  if (!section) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    excerpt,
  ] = await Promise.all([supabase.auth.getUser(), getEcfrSectionExcerpt(section)]);

  const jur = section.jurisdictionCode.toLowerCase();

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/browse" className="hover:text-foreground">
            {t("breadcrumbBrowse")}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/regwatch/browse/${jur}`}
            className="hover:text-foreground"
          >
            {section.jurisdictionCode}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{section.identifier}</span>
        </nav>

        <header className="mt-4">
          <span className="inline-block rounded border border-card-border bg-card-bg/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            {section.levelLabel}
          </span>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {section.identifier}
          </h1>
          {section.title && (
            <p className="mt-1 text-lg text-foreground/80">{section.title}</p>
          )}
        </header>

        <section className="mt-6 rounded-xl border border-card-border bg-card-bg/40 p-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("summary")}
          </p>
          {excerpt ? (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {excerpt}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">{t("previewUnavailable")}</p>
          )}
          <p className="mt-3 text-[11px] text-muted">{t("excerptCaption")}</p>
        </section>

        {section.sourceUrl && (
          <div className="mt-6">
            <a
              href={section.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue/90"
            >
              {t("readFullSection")}
              <span aria-hidden>↗</span>
            </a>
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}
