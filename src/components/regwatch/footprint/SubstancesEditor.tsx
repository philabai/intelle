"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

const CAS_PATTERN = /^\d{1,7}-\d{2}-\d$/;

const COMMON_PRESETS: { label: string; cas: string[] }[] = [
  { label: "Methane (74-82-8)", cas: ["74-82-8"] },
  { label: "Benzene (71-43-2)", cas: ["71-43-2"] },
  { label: "Hydrogen sulphide (7783-06-4)", cas: ["7783-06-4"] },
  { label: "Carbon disulphide (75-15-0)", cas: ["75-15-0"] },
  { label: "PFOS (1763-23-1)", cas: ["1763-23-1"] },
  { label: "PFOA (335-67-1)", cas: ["335-67-1"] },
  { label: "Chlorine (7782-50-5)", cas: ["7782-50-5"] },
  { label: "Ammonia (7664-41-7)", cas: ["7664-41-7"] },
];

export function SubstancesEditor({ value, onChange }: Props) {
  const t = useTranslations("regwatch.comply");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addCas(raw: string) {
    setError(null);
    const candidates = raw
      .split(/[\s,;\n]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;
    const invalid = candidates.filter((c) => !CAS_PATTERN.test(c));
    if (invalid.length > 0) {
      setError(t("invalidCasFormat", { list: invalid.join(", ") }));
      return;
    }
    const merged = Array.from(new Set([...value, ...candidates]));
    onChange(merged);
    setDraft("");
  }

  function remove(cas: string) {
    onChange(value.filter((v) => v !== cas));
  }

  function togglePreset(preset: string[]) {
    const allActive = preset.every((c) => value.includes(c));
    if (allActive) {
      onChange(value.filter((v) => !preset.includes(v)));
    } else {
      onChange(Array.from(new Set([...value, ...preset])));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCas(draft);
            }
          }}
          placeholder={t("addCasPlaceholder")}
          className="flex-1 rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={() => addCas(draft)}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90"
        >
          {t("add")}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          {t("quickAdd")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PRESETS.map((p) => {
            const active = p.cas.every((c) => value.includes(c));
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => togglePreset(p.cas)}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                  active
                    ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                    : "border-card-border bg-card-bg text-muted hover:border-brand-blue/60 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("tracked", { count: value.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {value.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => remove(c)}
                className="inline-flex items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 font-mono text-[11px] text-brand-teal hover:bg-brand-teal/20"
              >
                {c}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
