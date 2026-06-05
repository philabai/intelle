import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getBriefing } from "@/lib/regwatch/briefing-queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { StatusChip } from "@/components/regwatch/StatusChip";
import { InstrumentTypeBadge } from "@/components/regwatch/InstrumentTypeBadge";
import { TrustMarker } from "@/components/regwatch/briefing/TrustMarker";
import { BriefingBody } from "@/components/regwatch/briefing/BriefingBody";
import { RegwatchChatWidget } from "@/components/regwatch/chat/RegwatchChatWidget";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const briefing = await getBriefing(id);
  if (!briefing) return { title: "Briefing not found" };
  return {
    title: `Impact briefing — ${briefing.item.citation}`,
    description: briefing.headline,
  };
}

export default async function BriefingDetailPage({ params }: Props) {
  const { id } = await params;
  const briefing = await getBriefing(id);
  if (!briefing) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const generatedAgo = formatDistanceToNowStrict(new Date(briefing.generated_at), {
    addSuffix: true,
  });

  return (
    <RegwatchAppShell authed={!!user} suppressChatWidget>
      <RegwatchChatWidget
        scopedItemId={briefing.item.id}
        scopedItemCitation={briefing.item.citation}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/regwatch/r/${briefing.item.jurisdiction_code.toLowerCase()}/${briefing.item.slug}`}
            className="hover:text-foreground"
          >
            {briefing.item.citation}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Impact briefing</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="rounded-md bg-brand-navy/60 px-2 py-0.5 font-medium uppercase tracking-wider">
              {briefing.item.jurisdiction_code}
            </span>
            <span className="font-medium text-foreground/80">
              {briefing.item.regulator.short_name ?? briefing.item.regulator.name}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono">{briefing.item.citation}</span>
            <InstrumentTypeBadge value={briefing.item.instrument_type} />
            <StatusChip status={briefing.item.status} />
            <TrustMarker counts={briefing.trust_markers} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {briefing.headline}
          </h1>
          <p className="mt-2 text-xs text-muted">
            Briefing generated {generatedAgo}. Citation-grounded synthesis from{" "}
            {briefing.citations.length}{" "}
            {briefing.citations.length === 1 ? "corpus source" : "corpus sources"}.
            Verify every claim against the cited source before relying on it for
            compliance evidence.
          </p>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="space-y-8">
            <Section eyebrow="Why it matters" accent="brand-teal">
              <BriefingBody
                text={briefing.why_it_matters}
                citations={briefing.citations}
              />
            </Section>

            <Section eyebrow="Details" accent="brand-blue">
              <BriefingBody text={briefing.details} citations={briefing.citations} />
            </Section>

            <Section eyebrow="What to do now" accent="brand-violet">
              <BriefingBody
                text={briefing.what_to_do_now}
                citations={briefing.citations}
              />
            </Section>

            {briefing.deeper_resources && (
              <Section eyebrow="Deeper resources" accent="muted">
                <BriefingBody
                  text={briefing.deeper_resources}
                  citations={briefing.citations}
                />
              </Section>
            )}
          </article>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-card-border bg-card-bg p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                Sources
              </h2>
              {briefing.citations.length === 0 ? (
                <p className="mt-2 text-xs text-muted">No citations recorded.</p>
              ) : (
                <ol className="mt-2 space-y-3">
                  {briefing.citations.map((c) => (
                    <li
                      key={c.index}
                      className="rounded-md border border-card-border bg-background/40 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-brand-teal">[{c.index}]</span>
                        <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                          {c.jurisdiction_code}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-foreground">{c.title}</p>
                      <p className="font-mono text-[10px] text-muted">{c.citation}</p>
                      <p className="text-[11px] text-muted">{c.regulator}</p>
                      <div className="mt-2 flex gap-2">
                        <Link
                          href={`/regwatch/r/${c.jurisdiction_code.toLowerCase()}/${c.slug}`}
                          className="text-brand-teal hover:underline"
                        >
                          Open
                        </Link>
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-foreground"
                        >
                          Source ↗
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-lg border border-card-border bg-card-bg p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                Original regulation
              </h2>
              <Link
                href={`/regwatch/r/${briefing.item.jurisdiction_code.toLowerCase()}/${briefing.item.slug}`}
                className="mt-2 inline-flex items-center text-sm text-brand-teal hover:underline"
              >
                Open {briefing.item.citation} →
              </Link>
              <a
                href={briefing.item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-[11px] text-muted hover:text-foreground"
              >
                {briefing.item.source_url}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </RegwatchAppShell>
  );
}

function Section({
  eyebrow,
  accent,
  children,
}: {
  eyebrow: string;
  accent: "brand-teal" | "brand-blue" | "brand-violet" | "muted";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "brand-teal"
      ? "text-brand-teal"
      : accent === "brand-blue"
        ? "text-brand-blue"
        : accent === "brand-violet"
          ? "text-brand-violet"
          : "text-muted";
  return (
    <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
      <p
        className={`mb-3 text-[10px] font-medium uppercase tracking-wider ${accentClass}`}
      >
        {eyebrow}
      </p>
      {children}
    </section>
  );
}
