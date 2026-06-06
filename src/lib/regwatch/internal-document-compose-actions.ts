"use server";

import { z } from "zod";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";

/**
 * Validates a citation request from the compose workspace. The client
 * sends the desired (regulatoryItemId, clauseAnchor, displayText); we
 * confirm the regulation exists, capture its current `last_changed_at`
 * as the `pinnedVersion`, and return the canonical payload the TipTap
 * `citedClause` node stores.
 *
 * Pinning matters for PR-6's supersession path: when the regulation's
 * last_changed_at advances past the pinned value, the citation pill
 * gets flagged stale in the review panel's citation review queue.
 */

interface PreparedCitation {
  ok: boolean;
  error?: string;
  payload?: {
    regId: string;
    clauseAnchor: string;
    pinnedVersion: string | null;
    displayText: string;
  };
}

const inputSchema = z.object({
  regulatoryItemId: z.string().uuid(),
  clauseAnchor: z.string().trim().min(1).max(200),
  displayText: z.string().trim().min(1).max(200).optional(),
});

export async function prepareCitedClause(
  input: unknown,
): Promise<PreparedCitation> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "Not authenticated" };
  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Internal documents require the ${gate.requiredTier} plan.`,
    };
  }

  const svc = createServiceClient();
  const { data: reg, error } = await svc
    .from("regulatory_items")
    .select("id, citation, jurisdiction_code, last_changed_at")
    .eq("id", parsed.data.regulatoryItemId)
    .maybeSingle();
  if (error || !reg) {
    return { ok: false, error: "Regulation not found" };
  }

  const citation = reg.citation as string;
  const jurisdiction = reg.jurisdiction_code as string;
  const pinnedVersion = (reg.last_changed_at as string | null) ?? null;

  // displayText defaults to "<JUR> <citation> · <anchor>" so the pill is
  // self-documenting in the editor + export.
  const display =
    parsed.data.displayText?.trim() ||
    `${jurisdiction} ${citation} · ${parsed.data.clauseAnchor}`;

  return {
    ok: true,
    payload: {
      regId: parsed.data.regulatoryItemId,
      clauseAnchor: parsed.data.clauseAnchor,
      pinnedVersion,
      displayText: display,
    },
  };
}
