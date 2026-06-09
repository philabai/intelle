import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { TUTORIALS, tutorialUrl } from "@/lib/regwatch/tutorials";

export const metadata: Metadata = {
  title: "Video tutorials — Vantage",
  description:
    "Short walkthroughs of Vantage by intelle.io — exploring regulations, monitoring your feed, managing compliance, and authoring documents.",
};
export const dynamic = "force-dynamic";

export default async function TutorialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Tutorials
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            See Vantage in action
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Four short walkthroughs covering the core workflows — no audio, just
            click-throughs with on-screen labels. Press play on any one.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {TUTORIALS.map((t, i) => (
            <section key={t.slug}>
              <div className="overflow-hidden rounded-xl border border-card-border bg-black">
                <video
                  controls
                  preload="metadata"
                  className="aspect-video w-full"
                  src={tutorialUrl(t.file)}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {i + 1}. {t.title}
                </h2>
                <span className="shrink-0 text-[11px] text-muted">
                  {t.durationLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
            </section>
          ))}
        </div>
      </div>
    </RegwatchAppShell>
  );
}
