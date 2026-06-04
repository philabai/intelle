"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SAMPLE_QUERIES = [
  "methane emission reduction in oil and gas",
  "40 CFR 261.4",
  "What does CBAM require for cement importers?",
  "PFAS restriction REACH Annex XVII",
  "FuelEU Maritime GHG intensity 2030 target",
];

export function SearchInput({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    const next = new URLSearchParams(params.toString());
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything, paste a citation, or search keywords…"
          className="flex-1 rounded-md border border-card-border bg-card-bg px-4 py-3 text-base text-foreground placeholder:text-muted/70 focus:border-brand-blue focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-md bg-brand-blue px-6 py-3 text-sm font-medium text-white hover:bg-brand-blue/90"
        >
          Search
        </button>
      </div>
      {!initialQuery && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted">Try:</span>
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setValue(q);
                const next = new URLSearchParams(params.toString());
                next.set("q", q);
                startTransition(() => router.push(`${pathname}?${next.toString()}`));
              }}
              className="rounded-full border border-card-border bg-card-bg px-2 py-0.5 text-[11px] text-muted hover:border-brand-teal hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
