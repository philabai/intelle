"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { createPillar, updatePillar } from "@/lib/outreach/actions";
import type { PillarWeekStatus } from "@/lib/outreach/weekly-status";

export function PillarsManager({ pillars }: { pillars: PillarWeekStatus[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Failed");
      else { after?.(); router.refresh(); }
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {pillars.map((p) => (
        <div key={p.id} className="rounded-lg border border-card-border bg-card-bg p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{p.name}</span>
                {!p.active && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">inactive</span>}
              </div>
              <p className="text-xs text-muted">
                {p.thisWeek}/{p.weeklyTarget} this week · {p.remaining} to go · {p.seedsAvailable} seed{p.seedsAvailable === 1 ? "" : "s"}
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              Weekly target
              <input
                type="number" min={0} max={50} defaultValue={p.weeklyTarget}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== p.weeklyTarget) run(() => updatePillar({ pillarId: p.id, weeklyPostTarget: v }));
                }}
                className="w-16 rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" defaultChecked={p.active} disabled={pending}
                onChange={(e) => run(() => updatePillar({ pillarId: p.id, active: e.target.checked }))} />
              Active
            </label>

            <Link href={`/outreach/seeds?pillar=${p.slug}`} className="text-xs text-brand-blue hover:underline">Seeds →</Link>
            <button onClick={() => setEditing(editing === p.id ? null : p.id)} className="text-xs text-muted hover:text-white">
              {editing === p.id ? "Close" : "Edit"}
            </button>
          </div>

          {editing === p.id && <PillarEdit pillar={p} pending={pending} onSave={run} />}
        </div>
      ))}

      {adding ? (
        <PillarAdd pending={pending} onSave={run} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="rounded-md border border-dashed border-card-border px-4 py-2 text-sm text-muted hover:text-white hover:border-brand-blue">
          + Add pillar
        </button>
      )}
      {msg && <p className="text-xs text-red-400">{msg}</p>}
    </div>
  );
}

function PillarEdit({ pillar, pending, onSave }: {
  pillar: PillarWeekStatus; pending: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [name, setName] = useState(pillar.name);
  const [description, setDescription] = useState(pillar.description);
  const [voice, setVoice] = useState(pillar.editorialVoiceNotes ?? "");
  return (
    <div className="mt-3 space-y-2 border-t border-card-border pt-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={voice} onChange={(e) => setVoice(e.target.value)} rows={2} placeholder="Editorial voice notes"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <button disabled={pending}
        onClick={() => onSave(() => updatePillar({ pillarId: pillar.id, name, description, editorialVoiceNotes: voice || null }))}
        className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
        Save pillar
      </button>
    </div>
  );
}

function PillarAdd({ pending, onSave, onDone }: {
  pending: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [voice, setVoice] = useState("");
  const [target, setTarget] = useState(2);
  return (
    <div className="space-y-2 rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">New pillar</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Customer Stories)"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this pillar covers"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <textarea value={voice} onChange={(e) => setVoice(e.target.value)} rows={2} placeholder="Editorial voice notes (optional)"
        className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      <label className="flex items-center gap-2 text-xs text-muted">
        Weekly target
        <input type="number" min={0} max={50} value={target} onChange={(e) => setTarget(Number(e.target.value))}
          className="w-16 rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
      </label>
      <div className="flex gap-2">
        <button disabled={pending || !name.trim()}
          onClick={() => onSave(() => createPillar({ name, description, editorialVoiceNotes: voice, weeklyPostTarget: target }), onDone)}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
          Create
        </button>
        <button onClick={onDone} className="rounded-md border border-card-border px-3 py-1.5 text-sm text-muted hover:text-white">Cancel</button>
      </div>
    </div>
  );
}
