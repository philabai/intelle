"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { generateOnDemand } from "@/lib/outreach/actions";
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

export function GenerateForm({ pillars }: { pillars: { id: string; name: string; seeds: number; remaining?: number }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);

  const [pillarId, setPillarId] = useState(pillars[0]?.id ?? "");
  const [useSeed, setUseSeed] = useState(true);
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["linkedin", "x"]);
  const [geos, setGeos] = useState<GeoRegion[]>(["international"]);

  const selected = pillars.find((p) => p.id === pillarId);

  function toggle<T>(list: T[], v: T, set: (l: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await generateOnDemand({
        pillarId, brief: brief || undefined, useSeed,
        targetPlatforms: platforms, targetGeos: geos,
      });
      if (!r.ok) { setError(r.error); return; }
      if (r.postId) {
        // Stay on the page so the weekly tracker updates live; surface a link
        // to review the new draft. router.refresh() re-runs the server page.
        setLastDraftId(r.postId);
        setBrief("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 space-y-5 rounded-lg border border-card-border bg-card-bg p-5">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Pillar</span>
        <select value={pillarId} onChange={(e) => setPillarId(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground">
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.remaining ?? 0} to go · {p.seeds} seed{p.seeds === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={useSeed} onChange={(e) => setUseSeed(e.target.checked)} />
        Use the next unused seed for this pillar
        {selected && selected.seeds === 0 && useSeed && (
          <span className="text-xs text-amber-400">— none available, add a brief below</span>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
          Brief / direction {useSeed ? "(optional)" : "(required)"}
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

      {lastDraftId && !pending && (
        <div className="flex items-center justify-between rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-2 text-sm">
          <span className="text-brand-teal">Draft created and added to the review queue.</span>
          <Link href={`/outreach/posts/${lastDraftId}`} className="font-medium text-brand-teal hover:underline">Review it →</Link>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={pending || !pillarId || platforms.length === 0}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
          {pending ? "Generating + refining… (up to ~90s)" : "Generate draft"}
        </button>
        {lastDraftId && !pending && <span className="text-xs text-muted">Generate another, or review above.</span>}
      </div>
    </div>
  );
}
