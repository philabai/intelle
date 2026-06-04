"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function BrowseSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-2xl gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search regulations — try 'methane', '40 CFR 261', 'CBAM', 'PFAS'…"
        className="flex-1 rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-brand-blue focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
      >
        Search
      </button>
    </form>
  );
}
