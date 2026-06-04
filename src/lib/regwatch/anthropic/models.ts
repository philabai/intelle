/**
 * Model selection for RegWatch surfaces. The shared `getAnthropic()` singleton
 * lives at `@/lib/anthropic/client` and is reused across the main app and
 * RegWatch — this file only pins which models RegWatch surfaces should use.
 */
export const IRIS_MODEL = "claude-haiku-4-5-20251001";
export const IMPACT_BRIEFING_MODEL = "claude-opus-4-7";
export const ENRICHMENT_MODEL = "claude-haiku-4-5-20251001";
