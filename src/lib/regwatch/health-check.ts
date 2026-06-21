import { createServiceClient as regwatchService } from "@/lib/regwatch/supabase/service";
import { createServiceClient as outreachService } from "@/lib/outreach/supabase/service";

/**
 * Daily app health check. Inspects the ingestion → enrichment → matching →
 * alerting pipelines (plus the Outreach engine) and produces a consolidated
 * status with OK / WARN / CRITICAL signals. Designed to surface the kind of
 * silent stall that the ```json-fence enrichment bug caused — where crawling
 * kept working but nothing got enriched, so "real updates" quietly stopped.
 */

export type HealthLevel = "ok" | "warn" | "critical";

export interface HealthSignal {
  key: string;
  label: string;
  level: HealthLevel;
  value: string;
  detail?: string;
}

export interface HealthReport {
  generatedAt: string;
  overall: HealthLevel;
  signals: HealthSignal[];
}

const DAY_MS = 86_400_000;

/** Await a head:true count query (filters chained after .select). */
async function headCount(q: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}
const HEAD = { count: "exact", head: true } as const;

const worst = (levels: HealthLevel[]): HealthLevel =>
  levels.includes("critical") ? "critical" : levels.includes("warn") ? "warn" : "ok";

/** Probe the Anthropic API with a 1-token call and classify the result. There
 * is no public balance endpoint, so we surface OK / OUT-OF-CREDITS / key-error
 * rather than a dollar figure (the exact balance lives in the console). */
async function anthropicSignal(): Promise<HealthSignal> {
  try {
    const { getAnthropic } = await import("@/lib/anthropic/client");
    const { ENRICHMENT_MODEL } = await import("@/lib/regwatch/anthropic/models");
    await getAnthropic().messages.create({
      model: ENRICHMENT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
    return { key: "anthropic", label: "Anthropic API", level: "ok", value: "reachable · has credit" };
  } catch (e) {
    const msg = ((e as Error)?.message ?? String(e)).toLowerCase();
    if (msg.includes("credit balance") || msg.includes("too low") || msg.includes("billing")) {
      return {
        key: "anthropic", label: "Anthropic API", level: "critical", value: "OUT OF CREDITS",
        detail: "Balance is zero — enrichment + Outreach generation are blocked. Top up at console.anthropic.com → Plans & Billing, and turn ON auto-reload so this can't recur.",
      };
    }
    if (msg.includes("401") || msg.includes("authentication") || msg.includes("x-api-key") || msg.includes("invalid api")) {
      return { key: "anthropic", label: "Anthropic API", level: "critical", value: "key rejected", detail: "ANTHROPIC_API_KEY is invalid or revoked." };
    }
    return { key: "anthropic", label: "Anthropic API", level: "warn", value: "unreachable", detail: ((e as Error)?.message ?? "error").slice(0, 160) };
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const rw = regwatchService();
  const out = outreachService();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const signals: HealthSignal[] = [];

  // ---- Anthropic API: reachable + has credit? ----------------------------
  // The whole pipeline (enrichment + Outreach generation) dies the moment the
  // credit balance hits zero, so check it explicitly with a 1-token call.
  signals.push(await anthropicSignal());

  // ---- Ingestion: items crawled in the last 24h --------------------------
  const ingested24h = await headCount(
    rw.from("regulatory_items").select("*", HEAD).gte("ingested_at", since),
  );
  signals.push({
    key: "crawl",
    label: "Items crawled (24h)",
    level: ingested24h === 0 ? "warn" : "ok",
    value: String(ingested24h),
    detail: ingested24h === 0 ? "No new items ingested — connectors may be failing or it was a quiet day." : undefined,
  });

  // ---- Enrichment: pending backlog + throughput --------------------------
  const pending = await headCount(rw.from("regulatory_items").select("*", HEAD).eq("enrichment_status", "pending"));
  const failed = await headCount(rw.from("regulatory_items").select("*", HEAD).eq("enrichment_status", "failed"));
  const enriched24h = await headCount(
    rw.from("regulatory_items").select("*", HEAD).eq("enrichment_status", "enriched").gte("updated_at", since),
  );
  // The signature stall: a backlog exists but nothing is getting enriched.
  const enrichLevel: HealthLevel =
    pending > 0 && enriched24h === 0 ? "critical" : pending > 250 ? "warn" : "ok";
  signals.push({
    key: "enrichment",
    label: "Enrichment pipeline",
    level: enrichLevel,
    value: `${enriched24h} enriched/24h · ${pending} pending`,
    detail:
      enrichLevel === "critical"
        ? "STALLED: items are queued but none enriched in 24h. Check /api/cron/regwatch-enrich errors (model output parsing, API keys)."
        : enrichLevel === "warn"
          ? "Backlog building — enrichment is falling behind ingestion."
          : undefined,
  });
  if (failed > 0) {
    signals.push({
      key: "enrichment_failed",
      label: "Enrichment failures (total)",
      level: failed > 100 ? "warn" : "ok",
      value: String(failed),
      detail: failed > 100 ? "High failed count — inspect recent enrich error messages." : undefined,
    });
  }

  // ---- Embeddings: coverage among enriched (Voyage health) ----------------
  const missingEmbedding = await headCount(
    rw.from("regulatory_items").select("*", HEAD).eq("enrichment_status", "enriched").is("embedding", null),
  );
  signals.push({
    key: "embeddings",
    label: "Enriched items missing embedding",
    level: missingEmbedding > 500 ? "warn" : "ok",
    value: String(missingEmbedding),
    detail: missingEmbedding > 500 ? "Voyage may be rate-limited (429 — add billing) or unconfigured; vector search degrades." : undefined,
  });

  // ---- Matching + alerting throughput ------------------------------------
  const matches24h = await headCount(rw.from("footprint_matches").select("*", HEAD).gte("matched_at", since));
  signals.push({
    key: "matching",
    label: "Footprint matches (24h)",
    level: "ok",
    value: String(matches24h),
  });
  const deliveries24h = await headCount(rw.from("alert_deliveries").select("*", HEAD).gte("delivered_at", since));
  signals.push({
    key: "alerts",
    label: "Alert emails delivered (24h)",
    level: "ok",
    value: String(deliveries24h),
  });

  // ---- Outreach engine ----------------------------------------------------
  try {
    const pendingReview = await headCount(out.from("posts").select("*", HEAD).eq("status", "pending_review"));
    const unconsumedSeeds = await headCount(out.from("content_seeds").select("*", HEAD).eq("consumed", false));
    signals.push({
      key: "outreach",
      label: "Outreach queue",
      level: "ok",
      value: `${pendingReview} drafts to review · ${unconsumedSeeds} seeds ready`,
    });
  } catch {
    // outreach schema not present — skip silently.
  }

  return {
    generatedAt: new Date().toISOString(),
    overall: worst(signals.map((s) => s.level)),
    signals,
  };
}

const LEVEL_COLOR: Record<HealthLevel, string> = {
  ok: "#16a34a",
  warn: "#d97706",
  critical: "#dc2626",
};
const LEVEL_LABEL: Record<HealthLevel, string> = { ok: "OK", warn: "WARN", critical: "CRITICAL" };

/** Render the report as a standalone HTML email. */
export function renderHealthEmail(report: HealthReport): { subject: string; html: string } {
  const date = report.generatedAt.slice(0, 10);
  const subject = `[${LEVEL_LABEL[report.overall]}] intelle.io daily health — ${date}`;
  const rows = report.signals
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#111;">${s.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#444;">${s.value}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;font-weight:600;color:${LEVEL_COLOR[s.level]};">${LEVEL_LABEL[s.level]}</td>
      </tr>
      ${s.detail ? `<tr><td colspan="3" style="padding:0 12px 8px;font-size:12px;color:${LEVEL_COLOR[s.level]};border-bottom:1px solid #eee;">${s.detail}</td></tr>` : ""}`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="padding:18px 20px;background:${LEVEL_COLOR[report.overall]};color:#fff;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">intelle.io · Daily Health</div>
          <div style="font-size:20px;font-weight:700;margin-top:4px;">Overall: ${LEVEL_LABEL[report.overall]}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <div style="padding:12px 20px;font-size:11px;color:#888;">Generated ${report.generatedAt} · automated check of the crawl → enrich → match → alert pipelines + Outreach.</div>
      </div>
    </div>
  </body></html>`;
  return { subject, html };
}
