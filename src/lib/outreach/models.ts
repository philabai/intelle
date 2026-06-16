/**
 * Claude model selection for Vantage Outreach generation, mapped to content
 * length (brief Section 1). Reuses the same model IDs as the rest of intelle
 * (see src/lib/regwatch/anthropic/models.ts) so cost/latency stay consistent.
 */

// Long-form: LinkedIn articles, blog/insights posts, newsletter editions.
export const OUTREACH_LONGFORM_MODEL = "claude-opus-4-7";

// Medium-form: LinkedIn posts, X threads, derivative variants, quality-check.
export const OUTREACH_MEDIUM_MODEL = "claude-sonnet-4-6";

// Short-form: single posts, hashtags, alt-text, seed tagging.
export const OUTREACH_SHORT_MODEL = "claude-haiku-4-5-20251001";

/** Per-million-token USD pricing (input, output) for cost telemetry in
 * outreach.llm_calls. Update if Anthropic pricing changes. */
export const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-7": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return Number(((inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out).toFixed(4));
}
