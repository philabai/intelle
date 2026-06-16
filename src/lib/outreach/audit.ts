import { createServiceClient } from "@/lib/outreach/supabase/service";
import { estimateCostUsd } from "@/lib/outreach/models";

/** Append to outreach.audit_log. Non-blocking — never breaks the caller. */
export async function recordOutreachAudit(entry: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await createServiceClient().from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn(`[outreach.audit] ${entry.action} failed:`, (e as Error).message);
  }
}

/** Record an LLM call's token usage + estimated cost in outreach.llm_calls.
 * Non-blocking; returns the estimated USD so callers can stamp the post. */
export async function logLlmCall(entry: {
  postId?: string | null;
  purpose: "long_form" | "variants" | "hashtags" | "quality_check" | "seed_tagging" | "generation" | "adhoc";
  model: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<number> {
  const cost = estimateCostUsd(entry.model, entry.inputTokens, entry.outputTokens);
  try {
    await createServiceClient().from("llm_calls").insert({
      post_id: entry.postId ?? null,
      purpose: entry.purpose,
      model: entry.model,
      prompt_version: entry.promptVersion ?? null,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      cost_usd: cost,
    });
  } catch (e) {
    console.warn(`[outreach.llm_calls] log failed:`, (e as Error).message);
  }
  return cost;
}
