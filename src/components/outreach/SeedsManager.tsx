"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { createSeed, deleteSeed, updateSeed } from "@/lib/outreach/actions";
import type { GeoRegion } from "@/lib/outreach/types";

interface PillarOpt { id: string; slug: string; name: string; active: boolean }
interface Seed { id: string; title: string; summary: string; sourceType: string; geoRelevance: string[]; pillarId: string | null }

const SOURCE_BADGE: Record<string, string> = {
  regulator_update: "regulator", industry_news: "news", topic_calendar: "calendar", manual: "manual",
};
const GEOS: GeoRegion[] = ["international", "gcc", "us", "canada", "india"];

export function SeedsManager({ pillars, seeds, initialPillarSlug }: {
  pillars: PillarOpt[]; seeds: Seed[]; initialPillarSlug: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(initialPillarSlug ?? "all");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const nameById = new Map(pillars.map((p) => [p.id, p.name]));
  const idBySlug = new Map(pillars.map((p) => [p.slug, p.id]));
  const filterPillarId = filter === "all" ? null : idBySlug.get(filter) ?? null;
  const visible = filterPillarId ? seeds.filter((s) => s.pillarId === filterPillarId) : seeds;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Failed");
      else { after?.(); router.refresh(); }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm text-foreground">
          <option value="all">All pillars ({seeds.length})</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.slug}>{p.name} ({seeds.filter((s) => s.pillarId === p.id).length})</option>
          ))}
        </select>
        <button onClick={() => setAdding((a) => !a)} className="rounded-md border border-dashed border-card-border px-3 py-1.5 text-sm text-muted hover:text-white hover:border-brand-blue">
          {adding ? "Close" : "+ Add seed"}
        </button>
      </div>

      {adding && <SeedAdd pillars={pillars} defaultPillarId={filterPillarId ?? pillars[0]?.id} pending={pending} onSave={run} onDone={() => setAdding(false)} />}
      {msg && <p className="text-xs text-red-400">{msg}</p>}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-card-border bg-card-bg/40 p-8 text-center text-sm text-muted">
          No unused seeds here. Add one above, or let the seed crons populate this pillar.
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => (
            <li key={s.id} className="rounded-lg border border-card-border bg-card-bg p-3">
              {editing === s.id ? (
                <SeedEdit seed={s} pillars={pillars} pending={pending} onSave={run} onDone={() => setEditing(null)} />
              ) : (
                <div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{s.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{s.summary}</p>
                    </div>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">{SOURCE_BADGE[s.sourceType] ?? s.sourceType}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                    <span>{nameById.get(s.pillarId ?? "") ?? "—"}</span>
                    <span>·</span>
                    <span>{s.geoRelevance.join(", ") || "international"}</span>
                    <span className="flex-1" />
                    <button onClick={() => setEditing(s.id)} className="text-brand-blue hover:underline">Edit</button>
                    <button disabled={pending} onClick={() => run(() => deleteSeed({ seedId: s.id }))} className="text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GeoChips({ value, onChange }: { value: GeoRegion[]; onChange: (v: GeoRegion[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GEOS.map((g) => (
        <button key={g} type="button"
          onClick={() => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g])}
          className={`rounded-full border px-2.5 py-0.5 text-xs ${value.includes(g) ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : "border-card-border text-muted"}`}>
          {g}
        </button>
      ))}
    </div>
  );
}

function SeedEdit({ seed, pillars, pending, onSave, onDone }: {
  seed: Seed; pillars: PillarOpt[]; pending: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void; onDone: () => void;
}) {
  const [title, setTitle] = useState(seed.title);
  const [summary, setSummary] = useState(seed.summary);
  const [pillarId, setPillarId] = useState(seed.pillarId ?? pillars[0]?.id ?? "");
  const [geo, setGeo] = useState<GeoRegion[]>(seed.geoRelevance as GeoRegion[]);
  return (
    <div className="space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <div className="flex flex-wrap items-center gap-3">
        <select value={pillarId} onChange={(e) => setPillarId(e.target.value)} className="rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground">
          {pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <GeoChips value={geo} onChange={setGeo} />
      </div>
      <div className="flex gap-2">
        <button disabled={pending}
          onClick={() => onSave(() => updateSeed({ seedId: seed.id, title, summary, pillarId, geoRelevance: geo }), onDone)}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">Save</button>
        <button onClick={onDone} className="rounded-md border border-card-border px-3 py-1.5 text-sm text-muted hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

function SeedAdd({ pillars, defaultPillarId, pending, onSave, onDone }: {
  pillars: PillarOpt[]; defaultPillarId?: string; pending: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void; onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pillarId, setPillarId] = useState(defaultPillarId ?? pillars[0]?.id ?? "");
  const [geo, setGeo] = useState<GeoRegion[]>(["international"]);
  return (
    <div className="space-y-2 rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">New manual seed</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title / topic"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Summary / angle the generator should use"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <div className="flex flex-wrap items-center gap-3">
        <select value={pillarId} onChange={(e) => setPillarId(e.target.value)} className="rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground">
          {pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <GeoChips value={geo} onChange={setGeo} />
      </div>
      <div className="flex gap-2">
        <button disabled={pending || !title.trim() || !pillarId}
          onClick={() => onSave(() => createSeed({ pillarId, title, summary, geoRelevance: geo }), onDone)}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">Add seed</button>
        <button onClick={onDone} className="rounded-md border border-card-border px-3 py-1.5 text-sm text-muted hover:text-white">Cancel</button>
      </div>
    </div>
  );
}
