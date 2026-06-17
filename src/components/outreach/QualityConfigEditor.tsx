"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { resetGenerationConfig, updateGenerationConfig } from "@/lib/outreach/actions";
import type { GenerationConfig, QualityCharacteristic } from "@/lib/outreach/generation-config";

function newId() {
  try { return crypto.randomUUID(); } catch { return `c-${Date.now()}`; }
}

function PromptBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-card-border bg-card-bg">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-muted">{value.length} chars · {open ? "hide" : "edit"}</span>
      </button>
      {open && (
        <div className="border-t border-card-border p-3">
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={16}
            className="w-full rounded border border-card-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground" />
        </div>
      )}
    </div>
  );
}

export function QualityConfigEditor({ config }: { config: GenerationConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [qualityTarget, setQualityTarget] = useState(config.qualityTarget);
  const [maxRevisions, setMaxRevisions] = useState(config.maxRevisions);
  const [chars, setChars] = useState<QualityCharacteristic[]>(config.characteristics);
  const [composePrompt, setComposePrompt] = useState(config.composePrompt);
  const [qualityCheckPrompt, setQualityCheckPrompt] = useState(config.qualityCheckPrompt);
  const [revisePrompt, setRevisePrompt] = useState(config.revisePrompt);

  function setChar(id: string, patch: Partial<QualityCharacteristic>) {
    setChars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateGenerationConfig({ qualityTarget, maxRevisions, composePrompt, qualityCheckPrompt, revisePrompt, characteristics: chars });
      setMsg(r.ok ? "Saved — applies to the next generation." : r.error);
      if (r.ok) router.refresh();
    });
  }
  function reset() {
    if (!confirm("Reset prompts, characteristics, threshold and revisions to the shipped defaults?")) return;
    setMsg(null);
    startTransition(async () => {
      const r = await resetGenerationConfig();
      if (!r.ok) { setMsg(r.error); return; }
      router.refresh();
    });
  }

  const pct = Math.round(qualityTarget * 100);

  return (
    <div className="mt-6 space-y-6">
      {/* Pass bar + revisions */}
      <div className="rounded-lg border border-card-border bg-card-bg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Pass bar</span>
          <span className={`text-lg font-semibold ${pct >= 90 ? "text-brand-teal" : "text-amber-400"}`}>{pct}%</span>
        </div>
        <p className="mb-3 text-xs text-muted">Drafts below this confidence are flagged “below bar” in the queue. The engine revises up to the budget below trying to clear it.</p>
        <input type="range" min={50} max={99} step={1} value={pct}
          onChange={(e) => setQualityTarget(Number(e.target.value) / 100)}
          className="w-full accent-brand-blue" />
        <div className="mt-1 flex justify-between text-[10px] text-muted"><span>50%</span><span>75%</span><span>99%</span></div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          Revision budget
          <input type="number" min={0} max={5} value={maxRevisions} onChange={(e) => setMaxRevisions(Number(e.target.value))}
            className="w-16 rounded border border-card-border bg-background px-2 py-1 text-sm" />
          <span className="text-xs text-muted">revise passes per draft (each adds ~30–45s)</span>
        </label>
      </div>

      {/* Quality characteristics */}
      <div className="rounded-lg border border-card-border bg-card-bg p-4">
        <p className="text-sm font-medium text-white">Quality characteristics</p>
        <p className="mb-3 text-xs text-muted">Enabled items are appended to the compose prompt as extra requirements. Edit the instruction text, toggle, or add your own.</p>
        <div className="space-y-2">
          {chars.map((c) => (
            <div key={c.id} className="rounded border border-card-border bg-background p-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={c.enabled} onChange={(e) => setChar(c.id, { enabled: e.target.checked })} />
                <input value={c.label} onChange={(e) => setChar(c.id, { label: e.target.value })}
                  className="flex-1 bg-transparent text-sm text-white outline-none" />
                <button onClick={() => setChars((cs) => cs.filter((x) => x.id !== c.id))} className="text-xs text-red-400 hover:underline">remove</button>
              </div>
              <textarea value={c.instruction} onChange={(e) => setChar(c.id, { instruction: e.target.value })} rows={2}
                className="mt-1 w-full rounded border border-card-border bg-card-bg px-2 py-1 text-xs text-muted" />
            </div>
          ))}
        </div>
        <button onClick={() => setChars((cs) => [...cs, { id: newId(), label: "New requirement", instruction: "", enabled: true }])}
          className="mt-2 rounded border border-dashed border-card-border px-3 py-1.5 text-xs text-muted hover:text-white hover:border-brand-blue">
          + Add characteristic
        </button>
      </div>

      {/* Raw prompts */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Prompts</p>
        <PromptBox label="Compose prompt (generation)" value={composePrompt} onChange={setComposePrompt} />
        <PromptBox label="Quality-check rubric" value={qualityCheckPrompt} onChange={setQualityCheckPrompt} />
        <PromptBox label="Revise prompt" value={revisePrompt} onChange={setRevisePrompt} />
      </div>

      {msg && <p className="text-xs text-muted">{msg}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button onClick={reset} disabled={pending} className="rounded-md border border-card-border px-4 py-2 text-sm text-muted hover:text-white disabled:opacity-50">
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
