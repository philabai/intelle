"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { assignMatch } from "@/lib/regwatch/members-actions";

interface AssigneeOption {
  userId: string;
  displayName: string;
}

interface Props {
  matchId: string;
  options: AssigneeOption[];
  initialAssigneeId: string | null;
}

export function AssigneeSelect({
  matchId,
  options,
  initialAssigneeId,
}: Props) {
  const t = useTranslations("regwatch.monitor");
  const [assigneeId, setAssigneeId] = useState<string | null>(initialAssigneeId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const next = e.target.value === "" ? null : e.target.value;
    const prev = assigneeId;
    setAssigneeId(next);
    setError(null);
    startTransition(async () => {
      const res = await assignMatch({ matchId, assigneeUserId: next });
      if (!res.ok) {
        setError(res.error ?? t("assignError"));
        setAssigneeId(prev);
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-[11px] text-muted">
      <span>{t("assignedToLabel")}</span>
      <select
        value={assigneeId ?? ""}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        disabled={pending}
        className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[11px] text-foreground focus:border-brand-blue focus:outline-none disabled:opacity-50"
      >
        <option value="">{t("unassigned")}</option>
        {options.map((o) => (
          <option key={o.userId} value={o.userId}>
            {o.displayName}
          </option>
        ))}
      </select>
      {error && <span className="text-red-400">{error}</span>}
    </label>
  );
}
