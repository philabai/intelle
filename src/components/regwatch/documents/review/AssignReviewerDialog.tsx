"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/regwatch/Modal";
import { assignReviewerOrApprover } from "@/lib/regwatch/internal-document-workflow-actions";

interface OrgMemberOption {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  docId: string;
  /** Pre-loaded org members (server-passed). */
  members: OrgMemberOption[];
}

/**
 * Assign a reviewer or approver to the document. Admin-only on the
 * server. Reviewer ≠ approver enforced server-side (the action will
 * reject if the user is already the other role on this doc).
 */
export function AssignReviewerDialog({
  open,
  onClose,
  docId,
  members,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"reviewer" | "approver">("reviewer");
  const [userId, setUserId] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setError(null);
      setUserId("");
      setQuery("");
      setRole("reviewer");
    }
  }, [open]);

  const filtered = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q) ?? false)
    );
  });

  function onSubmit() {
    if (!userId) {
      setError("Pick a member first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await assignReviewerOrApprover({
        docId,
        userId,
        role,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not assign");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign reviewer or approver" size="md">
      <div className="space-y-3">
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["reviewer", "approver"] as const).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-md border p-2 text-xs ${
                role === r
                  ? "border-brand-blue bg-brand-blue/10"
                  : "border-card-border hover:border-card-border/80"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={role === r}
                onChange={() => setRole(r)}
                className="mr-2"
              />
              <span className="font-medium uppercase tracking-wider text-foreground">
                {r}
              </span>
              <p className="mt-0.5 text-[10px] text-muted">
                {r === "reviewer"
                  ? "Reviews the body; signature meaning='reviewed'."
                  : "Approves for use; signature meaning='approved'."}
              </p>
            </label>
          ))}
        </fieldset>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Find a member
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
          />
        </label>

        <div className="max-h-60 overflow-y-auto rounded-md border border-card-border bg-card-bg/20">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted">
              No members match.
            </p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => setUserId(m.userId)}
                className={`flex w-full items-center justify-between gap-2 border-b border-card-border px-3 py-2 text-left last:border-0 ${
                  userId === m.userId
                    ? "bg-brand-blue/15"
                    : "hover:bg-card-bg/60"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">
                    {m.displayName}
                  </p>
                  {m.email && (
                    <p className="truncate text-[10px] text-muted">
                      {m.email}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-muted">
                  {m.role}
                </span>
              </button>
            ))
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending || !userId}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
