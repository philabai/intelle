"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { acknowledgeFinding } from "@/lib/regwatch/evidence-actions";
import type { EvidenceFinding } from "@/lib/regwatch/evidence";

interface Props {
  evidenceFileId: string;
  findings: EvidenceFinding[];
  /** When false, hides the acknowledge controls (admin read-only). */
  canAcknowledge?: boolean;
  /** Optional refresh callback after an acknowledgement. */
  onChanged?: () => void;
}

const SEVERITY_STYLE: Record<EvidenceFinding["severity"], string> = {
  info: "bg-muted/20 text-muted",
  low: "bg-brand-blue/15 text-foreground",
  medium: "bg-amber-500/20 text-amber-200",
  high: "bg-red-500/25 text-red-200",
  critical: "bg-red-600/30 text-red-100",
};

export function FindingsPanel({
  evidenceFileId,
  findings,
  canAcknowledge = true,
  onChanged,
}: Props) {
  const t = useTranslations("regwatch.comply");
  if (findings.length === 0) {
    return (
      <p className="rounded-md border border-brand-teal/30 bg-brand-teal/5 p-3 text-xs text-brand-teal">
        {t("noDiscrepancies")}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {findings.map((f) => (
        <FindingRow
          key={f.id}
          evidenceFileId={evidenceFileId}
          finding={f}
          canAcknowledge={canAcknowledge}
          onChanged={onChanged}
        />
      ))}
    </ul>
  );
}

function FindingRow({
  evidenceFileId,
  finding,
  canAcknowledge,
  onChanged,
}: {
  evidenceFileId: string;
  finding: EvidenceFinding;
  canAcknowledge: boolean;
  onChanged?: () => void;
}) {
  const t = useTranslations("regwatch.comply");
  const format = useFormatter();
  const [showAck, setShowAck] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAcknowledge() {
    setError(null);
    startTransition(async () => {
      const res = await acknowledgeFinding({
        evidenceFileId,
        findingId: finding.id,
        note: note.trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? t("errCouldNotAcknowledge"));
        return;
      }
      setShowAck(false);
      setNote("");
      onChanged?.();
    });
  }

  const isAcknowledged = !!finding.acknowledged_at;

  return (
    <li
      className={`rounded-lg border p-3 ${
        isAcknowledged
          ? "border-card-border bg-card-bg/30"
          : "border-card-border bg-card-bg/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${SEVERITY_STYLE[finding.severity]}`}
            >
              {finding.severity}
            </span>
            <span className="text-muted">
              {t("confidenceAbbrev")} {(finding.confidence * 100).toFixed(0)}%
            </span>
            {finding.regulation_citation_anchor && (
              <span className="font-mono text-muted">
                · {finding.regulation_citation_anchor}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {finding.title}
          </p>
          <p className="mt-1 whitespace-pre-line text-xs text-foreground/80">
            {finding.explanation}
          </p>
          {finding.anchor && (
            <p className="mt-1 text-[11px] italic text-muted">
              {t("inTheEvidence")}: {finding.anchor}
            </p>
          )}
          {finding.suggested_action && (
            <p className="mt-1 rounded-md bg-brand-blue/10 px-2 py-1 text-[11px] text-foreground/90">
              {t("suggestedAction")}: {finding.suggested_action}
            </p>
          )}
          {isAcknowledged && (
            <div className="mt-2 rounded-md border border-brand-teal/30 bg-brand-teal/5 p-2 text-[11px]">
              <p className="font-medium text-brand-teal">
                {finding.acknowledged_at
                  ? t("acknowledgedAt", {
                      date: format.dateTime(new Date(finding.acknowledged_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    })
                  : t("acknowledgedLabel")}
              </p>
              {finding.acknowledgement_note && (
                <p className="mt-0.5 whitespace-pre-line text-foreground/80">
                  {finding.acknowledgement_note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {canAcknowledge && !isAcknowledged && (
        <div className="mt-2">
          {!showAck ? (
            <button
              type="button"
              onClick={() => setShowAck(true)}
              className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue"
            >
              {t("acknowledgeRespond")}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t("acknowledgePlaceholder")}
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAck(false);
                    setNote("");
                    setError(null);
                  }}
                  disabled={pending}
                  className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-muted hover:text-foreground disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={onAcknowledge}
                  disabled={pending}
                  className="rounded-md bg-brand-blue px-2 py-1 text-[10px] text-white hover:bg-brand-blue/90 disabled:opacity-50"
                >
                  {pending ? t("saving") : t("acknowledge")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
