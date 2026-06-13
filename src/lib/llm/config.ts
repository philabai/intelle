/**
 * Configuration + feature flags for "intelleLLM" — the self-hosted, privacy-
 * isolated AI stack for CUSTOMER documents (SOPs, policies, permits, evidence).
 *
 * Privacy model:
 *   - PUBLIC regulations may go to Anthropic / Voyage (third parties) — fine.
 *   - CUSTOMER documents must never touch a third party once isolation is ON.
 *
 * Default (INTELLELLM_ENABLED unset/false): customer-document AI keeps using the
 * existing providers exactly as today — Iris docs on Claude, evidence on Claude,
 * ASR on OpenAI, company-doc search FTS-only. NO behavior change.
 *
 * Flip INTELLELLM_ENABLED=true ONLY once the self-hosted endpoints are live.
 * Then customer data routes to intelleLLM ONLY and, on any outage/misconfig,
 * fails closed — it never silently falls back to a third party (see gateway.ts).
 *
 * intelleLLM is fronted by an Anthropic-Messages-compatible endpoint (e.g. a
 * LiteLLM proxy over vLLM/TGI), so the app keeps using the Anthropic SDK — only
 * the base URL + model change. The embedder + ASR are OpenAI-compatible REST.
 */

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Operator intent: customer data must be isolated to the self-hosted stack.
 * This is the single master switch. When false, everything behaves as today.
 */
export function isCustomerIsolationEnabled(): boolean {
  return process.env.INTELLELLM_ENABLED === "true";
}

// --- Chat / vision model (Iris docs, evidence analysis) --------------------

export interface IntelleChatConfig {
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
}

export function getIntelleChatConfig(): IntelleChatConfig {
  return {
    baseUrl: env("INTELLELLM_BASE_URL"),
    apiKey: env("INTELLELLM_API_KEY"),
    model: env("INTELLELLM_MODEL"),
  };
}

// --- Embeddings (customer-doc semantic search) -----------------------------

export interface IntelleEmbedConfig {
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  dim: number;
}

export function getIntelleEmbedConfig(): IntelleEmbedConfig {
  const dimRaw = env("INTELLE_EMBED_DIM");
  const dim = dimRaw ? Number.parseInt(dimRaw, 10) : 1024;
  return {
    baseUrl: env("INTELLE_EMBED_BASE_URL"),
    apiKey: env("INTELLE_EMBED_API_KEY"),
    model: env("INTELLE_EMBED_MODEL"),
    dim: Number.isFinite(dim) && dim > 0 ? dim : 1024,
  };
}

/**
 * Self-hosted customer-doc embeddings are used ONLY when isolation is on AND the
 * embedder is configured. Otherwise customer-doc search stays FTS-only — we
 * never embed customer text with Voyage (a third party).
 */
export function isIntelleEmbedEnabled(): boolean {
  const c = getIntelleEmbedConfig();
  return isCustomerIsolationEnabled() && !!c.baseUrl && !!c.model;
}

// --- ASR (evidence video + reviewer voice notes) ---------------------------

export interface IntelleAsrConfig {
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
}

export function getIntelleAsrConfig(): IntelleAsrConfig {
  return {
    baseUrl: env("INTELLE_ASR_BASE_URL"),
    apiKey: env("INTELLE_ASR_API_KEY"),
    model: env("INTELLE_ASR_MODEL") ?? "whisper-1",
  };
}

/**
 * Self-hosted ASR is used ONLY when isolation is on AND configured. When
 * isolation is OFF, the existing OpenAI Whisper path is used (today's behavior).
 */
export function isIntelleAsrEnabled(): boolean {
  const c = getIntelleAsrConfig();
  return isCustomerIsolationEnabled() && !!c.baseUrl;
}
