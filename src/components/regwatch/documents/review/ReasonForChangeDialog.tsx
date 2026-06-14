"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/regwatch/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  warning?: string;
  pending: boolean;
  errorMessage: string | null;
  onSubmit: (reasonForChange: string) => void;
  /** Optional label override on the primary action. */
  primaryLabel?: string;
}

/**
 * Reason-for-change capture before a state transition. Required by 21
 * CFR Part 11 / EU Annex 11 — every state change writes this string into
 * the audit trail alongside actor identity + timestamp.
 */
export function ReasonForChangeDialog({
  open,
  onClose,
  title,
  description,
  warning,
  pending,
  errorMessage,
  onSubmit,
  primaryLabel,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    onSubmit(reason.trim());
  }

  function handleClose() {
    if (pending) return;
    setReason("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        {description && (
          <p className="text-xs text-muted">{description}</p>
        )}
        {warning && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            {warning}
          </p>
        )}
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("reasonForChange")} <span className="text-red-400">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("reasonForChangeTransitionPlaceholder")}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            required
            minLength={3}
            maxLength={2000}
          />
          <p className="mt-1 text-[10px] text-muted">
            {t("reasonForChangeAuditHint")}
          </p>
        </label>
        {errorMessage && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
            {errorMessage}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={pending || reason.trim().length < 3}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? t("working") : (primaryLabel ?? t("continue"))}
          </button>
        </div>
      </form>
    </Modal>
  );
}
