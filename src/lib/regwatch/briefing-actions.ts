"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateBriefingForMatch } from "./briefing";
import { checkFeatureGate } from "./tier";

const inputSchema = z.object({ matchId: z.string().uuid() });

export interface GenerateBriefingActionResult {
  ok: boolean;
  briefingId?: string;
  error?: string;
}

export async function generateBriefing(
  input: unknown,
): Promise<GenerateBriefingActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid match id" };
  }
  const gate = await checkFeatureGate("impact_briefings");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Impact briefings require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  const result = await generateBriefingForMatch({ matchId: parsed.data.matchId });
  if (result.ok && result.briefingId) {
    revalidatePath("/regwatch/feed");
    revalidatePath(`/regwatch/briefing/${result.briefingId}`);
  }
  return result;
}
