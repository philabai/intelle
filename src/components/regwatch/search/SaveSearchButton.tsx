"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSearch } from "@/lib/regwatch/saved-searches-actions";

interface Props {
  query: string;
  /** Active filter params (sources/regulator/topic/instrument_type/status). */
  filters: Record<string, string>;
  resultCount: number;
  alreadySaved: boolean;
  authed: boolean;
}

/** Build /regwatch/search?q=…&<filters> for save + sign-in round-trips. */
function searchHref(query: string, filters: Record<string, string>): string {
  const params = new URLSearchParams({ q: query, ...filters });
  return `/regwatch/search?${params.toString()}`;
}

/**
 * "Save this search" — small inline button on the search results page.
 * Disabled when the query is too short or the user isn't signed in
 * (anon visitors see "Sign in to save" instead).
 *
 * Save is idempotent at the DB layer (unique on user + lower(query))
 * so the upsert just refreshes the timestamp if the same query was
 * already saved.
 */
export function SaveSearchButton({
  query,
  filters,
  resultCount,
  alreadySaved,
  authed,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(alreadySaved);
  const [error, setError] = useState<string | null>(null);

  if (!authed) {
    return (
      <a
        href={`/regwatch/login?next=${encodeURIComponent(searchHref(query, filters))}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted hover:border-brand-blue hover:text-foreground"
        title="Sign in to save searches"
      >
        ☆ Sign in to save
      </a>
    );
  }

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await saveSearch({ query, filters, resultCountAtSave: resultCount });
      if (!res.ok) {
        setError(res.error ?? "Could not save");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          saved
            ? "border-brand-teal/40 bg-brand-teal/10 text-brand-teal"
            : "border-card-border bg-card-bg text-foreground hover:border-brand-blue"
        }`}
        title={
          saved
            ? "Already in your Saved searches — click to refresh the timestamp"
            : "Save this query to /regwatch/saved"
        }
      >
        {saved ? "★ Saved" : "☆ Save this search"}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
      {saved && !error && (
        <a
          href="/regwatch/saved"
          className="text-[11px] text-brand-teal hover:underline"
        >
          View Saved →
        </a>
      )}
    </div>
  );
}
