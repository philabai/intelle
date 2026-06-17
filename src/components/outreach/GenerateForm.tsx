"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { getGenerationStatus, startGeneration } from "@/lib/outreach/actions";
import type { GeoRegion, Platform } from "@/lib/outreach/types";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
];
const GEOS: { value: GeoRegion; label: string }[] = [
  { value: "international", label: "International" },
  { value: "gcc", label: "GCC" },
  { value: "us", label: "US" },
  { value: "canada", label: "Canada" },
  { value: "india", label: "India" },
];

const POLL_MS = 3000;
const MAX_TRIES = 80; // ~4 minutes before we give up polling

type Job = { id: string; tries: number };
type Done = { id: string; title: string | null; ok: boolean; timedOut?: boolean };

type Seed = { id: string; title: string; summary: string; sourceType: string; pillarId: string | null };

export function GenerateForm({ pillars, seeds }: {
  pillars: { id: string; name: string; seeds: number; remaining?: number }[];
  seeds: Seed[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState<Job[]>([]);
  const [done, setDone] = useState<Done[]>([]);

  const [pillarId, setPillarId] = useState(pillars[0]?.id ?? "");
  const [seedChoice, setSeedChoice] = useState<string>("auto"); // "auto" | "none" | <seedId>
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["linkedin", "x"]);
  const [geos, setGeos] = useState<GeoRegion[]>(["international"]);

  const pillarSeeds = seeds.filter((s) => s.pillarId === pillarId);
  const chosenSeed = pillarSeeds.find((s) => s.id === seedChoice) ?? null;
  const autoSeed = pillarSeeds[0] ?? null; // newest unused = what "Auto" will use
  const briefRequired = seedChoice === "none" || (seedChoice === "auto" && !autoSeed);

  // Keep a ref to the live job list so the interval closure always sees current.
  const activeRef = useRef<Job[]>(active);
  activeRef.current = active;

  useEffect(() => {
    if (active.length === 0) return;
    const iv = setInterval(async () => {
      for (const job of activeRef.current) {
        if (job.tries > MAX_TRIES) {
          setActive((a) => a.filter((x) => x.id !== job.id));
          setDone((d) => [{ id: job.id, title: null, ok: false, timedOut: true }, ...d]);
          continue;
        }
        const r = await getGenerationStatus(job.id);
        if (r.ok && r.status !== "generating") {
          const ok = r.status === "pending_review" || r.status === "under_review" || r.status === "approved";
          setActive((a) => a.filter((x) => x.id !== job.id));
          setDone((d) => [{ id: job.id, title: r.title, ok }, ...d]);
          router.refresh(); // refresh the weekly quota panel
        } else {
          setActive((a) => a.map((x) => (x.id === job.id ? { ...x, tries: x.tries + 1 } : x)));
        }
      }
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [active.length, router]);

  function toggle<T>(list: T[], v: T, set: (l: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const seedArgs =
      seedChoice === "none" ? { useSeed: false }
      : seedChoice === "auto" ? { useSeed: true }
      : { useSeed: true, seedId: seedChoice };
    const r = await startGeneration({ pillarId, brief: brief || undefined, ...seedArgs, targetPlatforms: platforms, targetGeos: geos });
    setSubmitting(false);
    if (!r.ok) { setError(r.error); return; }
    if (r.postId) {
      setActive((a) => [...a, { id: r.postId!, tries: 0 }]);
      setBrief("");
    }
  }

  return (
    <div className="mt-6 space-y-5 rounded-lg border border-card-border bg-card-bg p-5">
      {/* Ready / failed banners (the "page alert") */}
      {done.map((d) => (
        <div key={d.id}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${d.ok ? "border-brand-teal/50 bg-brand-teal/10" : "border-red-500/40 bg-red-500/10"}`}>
          <span className={d.ok ? "text-brand-teal" : "text-red-300"}>
            {d.ok ? `✓ Draft ready${d.title ? `: “${d.title}”` : ""} — added to the review queue.`
                  : d.timedOut ? "Generation is taking unusually long — check the review queue shortly." : "Generation failed. Try again or check the logs."}
          </span>
          <span className="flex items-center gap-3">
            {d.ok && <Link href={`/outreach/posts/${d.id}`} className="font-medium text-brand-teal hover:underline">Review it →</Link>}
            <button onClick={() => setDone((x) => x.filter((e) => e.id !== d.id))} className="text-muted hover:text-white">✕</button>
          </span>
        </div>
      ))}

      {active.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-brand-blue/40 bg-brand-blue/10 px-3 py-2 text-sm text-brand-blue">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-blue" />
          {active.length} draft{active.length === 1 ? "" : "s"} generating in the background — keep working or start another. We&apos;ll alert you here when ready (usually under 2 minutes).
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Pillar</span>
        <select value={pillarId} onChange={(e) => { setPillarId(e.target.value); setSeedChoice("auto"); }}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground">
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.remaining ?? 0} to go · {p.seeds} seed{p.seeds === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Seed</span>
        <select value={seedChoice} onChange={(e) => setSeedChoice(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="auto">{autoSeed ? `Auto — next unused: ${autoSeed.title.slice(0, 70)}` : "Auto — (no unused seed; brief only)"}</option>
          {pillarSeeds.map((s) => (
            <option key={s.id} value={s.id}>{s.title.slice(0, 90)}</option>
          ))}
          <option value="none">No seed — generate from my brief only</option>
        </select>
        {(chosenSeed || (seedChoice === "auto" && autoSeed)) && (
          <p className="mt-1.5 line-clamp-3 rounded border border-card-border bg-background/60 px-2 py-1.5 text-xs text-muted">
            {(chosenSeed ?? autoSeed)!.summary || "(no summary)"}
          </p>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
          Brief / direction {briefRequired ? "(required)" : "(optional)"}
        </span>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4}
          placeholder="e.g. Angle this around what compliance teams should do this quarter."
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground" />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Platforms</span>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button key={p.value} type="button" onClick={() => toggle(platforms, p.value, setPlatforms)}
              className={`rounded-full border px-3 py-1 text-sm ${platforms.includes(p.value) ? "border-brand-blue bg-brand-blue/10 text-brand-blue" : "border-card-border text-muted"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Geographies</span>
        <div className="flex flex-wrap gap-2">
          {GEOS.map((g) => (
            <button key={g.value} type="button" onClick={() => toggle(geos, g.value, setGeos)}
              className={`rounded-full border px-3 py-1 text-sm ${geos.includes(g.value) ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : "border-card-border text-muted"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button onClick={submit} disabled={submitting || !pillarId || platforms.length === 0}
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
        {submitting ? "Starting…" : "Generate draft"}
      </button>
    </div>
  );
}
