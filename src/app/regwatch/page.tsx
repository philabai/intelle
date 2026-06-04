import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const metadata: Metadata = {
  title: "RegWatch — Regulatory monitoring with footprint-aware impact",
  description:
    "Pull-model dashboard SaaS that monitors regulatory changes across global energy, environmental, industrial, and chemical regulators — with footprint-aware impact analysis.",
};

export default async function RegwatchLanding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32">
          <span className="inline-block rounded-full border border-brand-teal/40 bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
            Pull-model regulatory monitoring
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Know which regulations actually matter — for{" "}
            <span className="gradient-text">your operations.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            RegWatch monitors global energy, environmental, industrial, and chemical
            regulators, then scores each change against your operations footprint and
            delivers a 4-section impact briefing — citation-grounded, mobile-readable,
            no sales call required.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/regwatch/signup"
              className="rounded-md bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              Start free — browse the corpus
            </Link>
            <Link
              href="/regwatch/browse"
              className="rounded-md border border-card-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground hover:border-brand-teal"
            >
              Browse regulations
            </Link>
          </div>
          <p className="mt-12 text-xs text-muted">
            Phase 0 foundation — connectors, enrichment, footprint matching, and
            critical alerts roll out in Phase 1.
          </p>
        </div>
      </section>
    </RegwatchAppShell>
  );
}
