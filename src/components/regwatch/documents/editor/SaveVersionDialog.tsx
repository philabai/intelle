"use client";

import { useState } from "react";
import { Modal } from "@/components/regwatch/Modal";
import {
  formatVersion,
  nextVersion,
  VERSION_BUMP_LABEL,
  type SemVer,
  type VersionBump,
} from "@/lib/regwatch/templates/version";

interface Props {
  open: boolean;
  onClose: () => void;
  currentVersion: SemVer | null;
  pending: boolean;
  errorMessage: string | null;
  onSubmit: (input: { versionBump: VersionBump; reasonForChange: string }) => void;
}

/**
 * Save version dialog. User picks major / minor / patch + types a reason
 * for change. Required at every commit per 21 CFR Part 11 / EU Annex 11.
 * The next version is previewed live as the user toggles the radios.
 */
export function SaveVersionDialog({
  open,
  onClose,
  currentVersion,
  pending,
  errorMessage,
  onSubmit,
}: Props) {
  const [bump, setBump] = useState<VersionBump>("minor");
  const [reason, setReason] = useState("");

  const baseVersion = currentVersion ?? { major: 0, minor: 0, patch: 0 };
  const previewVersion = currentVersion
    ? nextVersion(baseVersion, bump)
    : { major: 0, minor: 1, patch: 0 };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    onSubmit({ versionBump: bump, reasonForChange: reason.trim() });
  }

  return (
    <Modal open={open} onClose={onClose} title="Save version" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md border border-card-border bg-card-bg/30 p-3 text-xs">
          <p className="text-muted">Current version</p>
          <p className="mt-0.5 font-mono text-foreground">
            {currentVersion ? formatVersion(currentVersion) : "— (first save)"}
          </p>
          <p className="mt-2 text-muted">After this save</p>
          <p className="mt-0.5 font-mono text-brand-teal">
            {formatVersion(previewVersion)}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Bump type
          </legend>
          {(["major", "minor", "patch"] as VersionBump[]).map((b) => (
            <label
              key={b}
              className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs ${
                bump === b
                  ? "border-brand-blue bg-brand-blue/10"
                  : "border-card-border hover:border-card-border/80"
              }`}
            >
              <input
                type="radio"
                name="bump"
                checked={bump === b}
                onChange={() => setBump(b)}
                className="mt-0.5"
              />
              <span className="text-foreground/90">{VERSION_BUMP_LABEL[b]}</span>
            </label>
          ))}
        </fieldset>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Reason for change <span className="text-red-400">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Brief, specific. Auditors will read this. Example: 'Updated §4.2 to reflect the new gas-detection alarm setpoint per MoC-2026-014.'"
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            required
            minLength={3}
            maxLength={2000}
          />
          <p className="mt-1 text-[10px] text-muted">
            Required by 21 CFR Part 11 / EU Annex 11 — every save is recorded
            with this reason in the immutable audit trail.
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
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || reason.trim().length < 3}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : `Save ${formatVersion(previewVersion)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
