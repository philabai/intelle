"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  updateMemberRole,
  removeMember,
} from "@/lib/regwatch/members-actions";
import type { OrgMember, AdminRole } from "@/lib/regwatch/members";

interface Props {
  members: OrgMember[];
  callerCanManage: boolean;
}

const ROLE_OPTIONS: { value: AdminRole; labelKey: string }[] = [
  { value: "owner", labelKey: "roleOwner" },
  { value: "admin", labelKey: "roleAdmin" },
  { value: "member", labelKey: "roleMember" },
];

export function MembersTable({ members, callerCanManage }: Props) {
  const t = useTranslations("regwatch.members");
  const format = useFormatter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((s) => new Set(s).add(id));
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    });
  }

  async function onRoleChange(member: OrgMember, role: AdminRole) {
    withPending(member.membershipId, async () => {
      const res = await updateMemberRole({
        membershipId: member.membershipId,
        role,
      });
      if (!res.ok) setError(res.error ?? t("couldNotUpdateRole"));
    });
  }

  async function onRemove(member: OrgMember) {
    if (
      !confirm(
        t("removeConfirm", {
          member: member.email ?? member.userId.slice(0, 8),
        }),
      )
    ) {
      return;
    }
    withPending(member.membershipId, async () => {
      const res = await removeMember({ membershipId: member.membershipId });
      if (!res.ok) setError(res.error ?? t("couldNotRemoveMember"));
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-background">
      <div className="hidden grid-cols-[1fr_180px_180px_140px_60px] gap-3 border-b border-card-border bg-card-bg/60 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted sm:grid">
        <span>{t("email")}</span>
        <span>{t("functionalRole")}</span>
        <span>{t("adminRole")}</span>
        <span>{t("joined")}</span>
        <span></span>
      </div>
      <ul>
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted">
            {t("noMembersYet")}
          </li>
        ) : (
          members.map((m) => {
            const isPending = pendingIds.has(m.membershipId);
            return (
              <li
                key={m.membershipId}
                className="grid grid-cols-1 gap-2 border-b border-card-border px-4 py-3 sm:grid-cols-[1fr_180px_180px_140px_60px] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {m.email ?? (
                      <span className="text-muted">{t("noEmail")}</span>
                    )}
                    {m.isMe && (
                      <span className="ms-2 rounded bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-teal">
                        {t("you")}
                      </span>
                    )}
                  </p>
                  {m.fullName && (
                    <p className="truncate text-[11px] text-muted">
                      {m.fullName}
                    </p>
                  )}
                </div>
                <p className="truncate text-xs text-muted sm:text-foreground">
                  {m.functionalRoleLabel}
                </p>
                {callerCanManage && !m.isMe ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      onRoleChange(m, e.target.value as AdminRole)
                    }
                    disabled={isPending}
                    className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.labelKey)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-muted">
                    {(() => {
                      const opt = ROLE_OPTIONS.find((r) => r.value === m.role);
                      return opt ? t(opt.labelKey) : m.role;
                    })()}
                  </p>
                )}
                <p className="text-[11px] text-muted">
                  {format.relativeTime(new Date(m.createdAt))}
                </p>
                <div className="text-end">
                  {callerCanManage && !m.isMe && (
                    <button
                      type="button"
                      onClick={() => onRemove(m)}
                      disabled={isPending}
                      className="rounded border border-card-border px-2 py-0.5 text-[11px] text-muted hover:border-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {t("remove")}
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
      {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
