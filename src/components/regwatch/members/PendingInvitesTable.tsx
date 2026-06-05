"use client";

import { useTransition, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { resendInvite, revokeInvite } from "@/lib/regwatch/members-actions";
import type { PendingInvite } from "@/lib/regwatch/members";

interface Props {
  invites: PendingInvite[];
  callerCanManage: boolean;
}

export function PendingInvitesTable({ invites, callerCanManage }: Props) {
  if (invites.length === 0) return null;
  return (
    <section className="mt-6 rounded-xl border border-card-border bg-card-bg/40">
      <header className="border-b border-card-border px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Pending invites · {invites.length}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Signup links sent via Supabase. They&apos;ll join your org with the role below
          once they complete signup.
        </p>
      </header>
      <ul className="divide-y divide-card-border">
        {invites.map((inv) => (
          <PendingInviteRow
            key={inv.id}
            invite={inv}
            callerCanManage={callerCanManage}
          />
        ))}
      </ul>
    </section>
  );
}

function PendingInviteRow({
  invite,
  callerCanManage,
}: {
  invite: PendingInvite;
  callerCanManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [action, setAction] = useState<"resend" | "revoke" | null>(null);

  const sentAgo = formatDistanceToNowStrict(new Date(invite.createdAt), {
    addSuffix: true,
  });

  function handle(kind: "resend" | "revoke") {
    setMessage(null);
    setAction(kind);
    startTransition(async () => {
      const fn = kind === "resend" ? resendInvite : revokeInvite;
      const res = await fn({ inviteId: invite.id });
      if (!res.ok) {
        setMessage(res.error ?? "Failed");
      } else if (kind === "resend") {
        setMessage("Resent");
      }
      // revoke makes the row disappear via revalidatePath; no toast needed
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span className="truncate font-medium">{invite.email}</span>
          <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {invite.role}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Sent {sentAgo}
          {invite.invitedByEmail ? ` by ${invite.invitedByEmail}` : ""}
        </p>
        {message && <p className="mt-1 text-xs text-brand-teal">{message}</p>}
      </div>
      {callerCanManage && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handle("resend")}
            disabled={pending}
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && action === "resend" ? "Resending…" : "Resend"}
          </button>
          <button
            type="button"
            onClick={() => handle("revoke")}
            disabled={pending}
            className="rounded-md border border-red-500/40 bg-transparent px-3 py-1.5 text-xs text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && action === "revoke" ? "Revoking…" : "Revoke"}
          </button>
        </div>
      )}
    </li>
  );
}
