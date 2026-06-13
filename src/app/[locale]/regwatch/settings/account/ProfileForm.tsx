"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateMyName } from "@/lib/regwatch/profile-actions";

interface Props {
  initialFirstName: string;
  initialLastName: string;
}

/**
 * Inline name editor on the profile page. Pre-filled from the current
 * user_metadata. On save, refreshes the route so the Account-menu
 * trigger + the page greeting pick up the new name.
 */
export function ProfileForm({ initialFirstName, initialLastName }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    firstName.trim() !== initialFirstName.trim() ||
    lastName.trim() !== initialLastName.trim();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateMyName({ firstName, lastName });
      if (!res.ok) {
        setError(res.error ?? "Could not save");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-card-border pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Your name
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] text-muted">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setSaved(false);
            }}
            autoComplete="given-name"
            className="rounded-md border border-card-border bg-background px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] text-muted">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setSaved(false);
            }}
            autoComplete="family-name"
            className="rounded-md border border-card-border bg-background px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-md bg-brand-blue px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save name"}
        </button>
        {saved && !error && (
          <span className="text-[11px] text-brand-teal">✓ Saved</span>
        )}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>
    </form>
  );
}
