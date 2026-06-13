import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic/client";
import { isCustomerIsolationEnabled, getIntelleChatConfig } from "./config";

/**
 * Sensitivity-aware LLM provider gateway.
 *
 *   getPublicLLM()   → always Anthropic/Claude (public regulations).
 *   getCustomerLLM() → Anthropic (today's behavior) while isolation is OFF;
 *                      intelleLLM ONLY while isolation is ON.
 *
 * Because intelleLLM is fronted by an Anthropic-Messages-compatible endpoint,
 * both providers return an `Anthropic` client + a model id — every existing
 * call site (content blocks, tool-use, vision, streaming) works unchanged; only
 * the client + model differ.
 *
 * Fail-closed guarantee: when isolation is ON but the endpoint isn't configured,
 * getCustomerLLM THROWS rather than returning the public Anthropic client — we
 * never silently send customer data to a third party. Call sites already wrap
 * their model call in try/catch and surface a graceful error / re-runnable
 * failure, so the throw degrades safely instead of leaking.
 */

export class IntelleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntelleConfigError";
  }
}

export interface ResolvedLLM {
  client: Anthropic;
  model: string;
  /** True when the call is routed to the isolated self-hosted stack. */
  isolated: boolean;
}

let _intelleClient: Anthropic | null = null;

function getIntelleClient(): { client: Anthropic; model: string } {
  const cfg = getIntelleChatConfig();
  if (!cfg.baseUrl || !cfg.model) {
    throw new IntelleConfigError(
      "INTELLELLM_ENABLED is true but INTELLELLM_BASE_URL / INTELLELLM_MODEL are not set — refusing to route customer data to a third-party model.",
    );
  }
  if (!_intelleClient) {
    _intelleClient = new Anthropic({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey ?? "intellellm",
    });
  }
  return { client: _intelleClient, model: cfg.model };
}

/** Public-regulation AI — always Anthropic/Claude. */
export function getPublicLLM(claudeModel: string): ResolvedLLM {
  return { client: getAnthropic(), model: claudeModel, isolated: false };
}

/**
 * Customer-document AI.
 *   isolation OFF → Anthropic + the given Claude model (today's behavior).
 *   isolation ON  → intelleLLM only (throws if not configured; never falls back).
 *
 * @param claudeModelWhenDisabled the Claude model to use while isolation is off
 *   (e.g. IRIS_MODEL, EVIDENCE_ANALYSIS_MODEL) — preserves current behavior.
 */
export function getCustomerLLM(claudeModelWhenDisabled: string): ResolvedLLM {
  if (!isCustomerIsolationEnabled()) {
    return {
      client: getAnthropic(),
      model: claudeModelWhenDisabled,
      isolated: false,
    };
  }
  const { client, model } = getIntelleClient();
  return { client, model, isolated: true };
}
