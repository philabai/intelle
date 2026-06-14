"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface Props {
  connectorId: string;
  label: string;
  regulatorSlug: string;
  supportsHierarchy: boolean;
}

interface RunResult {
  ok: boolean;
  fetched?: number;
  persisted?: number;
  fetch_errors?: string[];
  persist_errors?: string[];
  hierarchy?: { upserted: number; errors: string[] } | null;
  error?: string;
  duration_ms?: number;
}

/**
 * Admin-only one-shot trigger for a single connector. Sits in
 * /regwatch/admin/connectors. POSTs to the admin endpoint and
 * surfaces the run telemetry inline so you can see fetch + persist
 * counts (or the error) right away.
 */
export function RunConnectorRow({
  connectorId,
  label,
  regulatorSlug,
  supportsHierarchy,
}: Props) {
  const t = useTranslations("regwatch.chips");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [includeHierarchy, setIncludeHierarchy] = useState(supportsHierarchy);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/regwatch/admin/run-connector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorId,
          includeHierarchy: supportsHierarchy && includeHierarchy,
        }),
      });
      const json = (await res.json()) as RunResult;
      setResult(json);
      if (json.ok) router.refresh();
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="rounded-md border border-card-border bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <p className="font-mono text-[10px] text-muted">
            {connectorId} → {regulatorSlug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {supportsHierarchy && (
            <label className="inline-flex items-center gap-1 text-[10px] text-muted">
              <input
                type="checkbox"
                checked={includeHierarchy}
                onChange={(e) => setIncludeHierarchy(e.target.checked)}
                className="h-3 w-3 accent-brand-blue"
              />
              {t("plusHierarchy")}
            </label>
          )}
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t("running") : t("runNow")}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-[11px] ${
            result.ok
              ? "border-brand-teal/40 bg-brand-teal/5 text-foreground/90"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {result.ok ? (
            <div className="space-y-0.5">
              <p>
                {t.rich("runResult", {
                  fetched: result.fetched ?? 0,
                  persisted: result.persisted ?? 0,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
                {result.duration_ms !== undefined && (
                  <> · {result.duration_ms} ms</>
                )}
              </p>
              {(result.fetch_errors?.length ?? 0) > 0 && (
                <p className="text-amber-300">
                  {t("fetchWarnings", {
                    warnings: result.fetch_errors!.join("; "),
                  })}
                </p>
              )}
              {(result.persist_errors?.length ?? 0) > 0 && (
                <p className="text-amber-300">
                  {t("persistWarnings", {
                    warnings: result.persist_errors!.join("; "),
                  })}
                </p>
              )}
              {result.hierarchy && (
                <p>
                  {t.rich("hierarchyResult", {
                    count: result.hierarchy.upserted,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                  {result.hierarchy.errors.length > 0 && (
                    <> · {result.hierarchy.errors.join("; ")}</>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p>{result.error ?? t("runFailed")}</p>
          )}
        </div>
      )}
    </li>
  );
}
