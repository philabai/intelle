import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic/client";
import { OUTREACH_LONGFORM_MODEL, OUTREACH_MEDIUM_MODEL } from "@/lib/outreach/models";
import { loadGenerationConfig, composeSystem, type GenerationConfig } from "@/lib/outreach/generation-config";
import { createServiceClient } from "@/lib/outreach/supabase/service";
import { logLlmCall, recordOutreachAudit } from "@/lib/outreach/audit";
import type { GeoRegion, Platform } from "@/lib/outreach/types";

const GENERATE_PROMPT_VERSION = "generate_v2";

const composeSchema = z.object({
  title: z.string().max(200),
  body_long: z.string().min(40),
  body_medium: z.string().min(20),
  body_short: z.string().max(400),
  body_thread: z.array(z.string()).max(8).default([]),
  hashtags: z.array(z.string()).max(8).default([]),
  citations: z
    .array(z.object({ n: z.number(), label: z.string(), url: z.string().optional() }))
    .max(20)
    .default([]),
  ai_confidence: z.number().min(0).max(1),
});

const reviewSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1),
  breakdown: z
    .array(z.object({ criterion: z.string(), score: z.number().min(0).max(1), note: z.string().optional() }))
    .default([]),
  issues: z
    .array(z.object({ severity: z.enum(["blocker", "warning"]), note: z.string() }))
    .default([]),
});

/** Appended to whatever (user-editable) QC rubric is in use, so the verdict
 * always carries a per-criterion breakdown regardless of the rubric text. */
const QC_BREAKDOWN_INSTRUCTION = `

## Output: per-criterion breakdown (required)
In addition to passed/confidence/issues, populate \`breakdown\`: one entry per distinct
criterion or dimension you evaluated above, each with \`criterion\` (a short name), \`score\`
(0–1, calibrated), and \`note\` (one line on what earned or lost the points). Cover every
major dimension in the rubric so the writer can see exactly where the score came from.`;

/** Force Claude to call one tool and return its validated input + usage. */
async function callTool<T>(opts: {
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Anthropic.Messages.Tool.InputSchema;
  schema: z.ZodType<T>;
  purpose: "generation" | "quality_check";
  postId?: string | null;
}): Promise<T> {
  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: opts.model,
    max_tokens: 4096,
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: opts.inputSchema }],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.user }],
  });
  await logLlmCall({
    postId: opts.postId,
    purpose: opts.purpose,
    model: opts.model,
    promptVersion: GENERATE_PROMPT_VERSION,
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error(`${opts.toolName}: model did not call the tool`);
  return opts.schema.parse(block.input);
}

export interface GeneratePostInput {
  pillarId: string;
  pillarName: string;
  pillarVoiceNotes?: string | null;
  seedId?: string | null;
  seedTitle?: string;
  seedSummary?: string;
  seedCitation?: string | null;
  seedSourceUrl?: string | null;
  brief?: string;
  targetPlatforms: Platform[];
  targetGeos: GeoRegion[];
  targetPersonas?: string[];
  actorId?: string | null;
  /** When set, fill this existing (status='generating') post instead of
   * inserting a new one — used by the async on-demand flow. */
  placeholderPostId?: string;
  /** Per-article quality override (merged over the global config). Persisted on
   * the post so future regenerations of this article reuse it. */
  configOverride?: Partial<GenerationConfig>;
}

/** Generate one post (long-form + platform variants), quality-check it, and
 * persist it to outreach.posts as `pending_review`. Returns the new post id. */
export async function generatePost(input: GeneratePostInput): Promise<string> {
  const user = [
    `PILLAR: ${input.pillarName}`,
    input.pillarVoiceNotes ? `PILLAR VOICE NOTES: ${input.pillarVoiceNotes}` : "",
    `TARGET PLATFORMS: ${input.targetPlatforms.join(", ")}`,
    `TARGET GEOGRAPHIES: ${input.targetGeos.join(", ") || "international"}`,
    input.brief ? `EDITOR BRIEF / DIRECTION: ${input.brief}` : "",
    "",
    "SEED:",
    input.seedTitle ? `Title: ${input.seedTitle}` : "",
    input.seedCitation ? `Citation: ${input.seedCitation}` : "",
    input.seedSourceUrl ? `Source URL: ${input.seedSourceUrl}` : "",
    input.seedSummary ? `Summary: ${input.seedSummary}` : "(no seed — write from the pillar + brief)",
  ]
    .filter(Boolean)
    .join("\n");

  // Live, admin-editable config (prompts, quality bar, revise budget,
  // characteristics) from the Quality & Prompts page, with any per-article
  // override merged on top.
  const loadedConfig = await loadGenerationConfig();
  const config = input.configOverride ? { ...loadedConfig, ...input.configOverride } : loadedConfig;

  // 1. Generation (Opus, forced tool).
  let composed = await callTool({
    model: OUTREACH_LONGFORM_MODEL,
    system: composeSystem(config),
    user,
    toolName: "compose_post",
    toolDescription: "Return the long-form piece and its platform variants.",
    inputSchema: COMPOSE_TOOL_SCHEMA,
    schema: composeSchema,
    purpose: "generation",
  });

  // 2. Quality check + revise-until-threshold loop. The Sonnet QC scores the
  // draft against the configured rubric; if it's below target or has a blocker,
  // Opus revises addressing the specific issues, then we re-check. Capped at
  // config.maxRevisions; the final confidence is whatever we converged to.
  const reviewOf = (draft: typeof composed) =>
    callTool({
      model: OUTREACH_MEDIUM_MODEL,
      system: config.qualityCheckPrompt + QC_BREAKDOWN_INSTRUCTION,
      user: JSON.stringify(draft),
      toolName: "review_post",
      toolDescription: "Audit the draft and return a verdict.",
      inputSchema: REVIEW_TOOL_SCHEMA,
      schema: reviewSchema,
      purpose: "quality_check",
    });

  let review = {
    passed: true,
    confidence: composed.ai_confidence,
    breakdown: [] as { criterion: string; score: number; note?: string }[],
    issues: [] as { severity: string; note: string }[],
  };
  try {
    review = await reviewOf(composed);
  } catch (e) {
    console.warn("[outreach.generate] quality-check failed (non-fatal):", (e as Error).message);
  }

  let revisions = 0;
  const needsWork = () => review.confidence < config.qualityTarget || review.issues.some((i) => i.severity === "blocker");
  while (needsWork() && revisions < config.maxRevisions) {
    revisions += 1;
    try {
      composed = await callTool({
        model: OUTREACH_LONGFORM_MODEL,
        system: config.revisePrompt,
        user: `${user}\n\nCURRENT DRAFT (JSON):\n${JSON.stringify(composed)}\n\nQC ISSUES TO FIX:\n${JSON.stringify(review.issues)}\n\nTarget confidence: ${config.qualityTarget}. Return the complete improved post.`,
        toolName: "compose_post",
        toolDescription: "Return the improved long-form piece and its platform variants.",
        inputSchema: COMPOSE_TOOL_SCHEMA,
        schema: composeSchema,
        purpose: "generation",
      });
      review = await reviewOf(composed);
    } catch (e) {
      console.warn("[outreach.generate] revision pass failed (non-fatal):", (e as Error).message);
      break;
    }
  }

  const confidence = Math.min(composed.ai_confidence, review.confidence);
  const meetsBar = confidence >= config.qualityTarget;

  // 3. Persist as pending_review — fill the placeholder if the async flow made
  // one, otherwise insert a fresh row.
  const svc = createServiceClient();
  const fields: Record<string, unknown> = {
    pillar_id: input.pillarId,
    seed_id: input.seedId ?? null,
    target_platforms: input.targetPlatforms,
    target_geos: input.targetGeos,
    target_personas: input.targetPersonas ?? [],
    title: composed.title,
    body_long: composed.body_long,
    body_medium: composed.body_medium,
    body_short: composed.body_short,
    body_thread: composed.body_thread,
    hashtags: composed.hashtags,
    citations: composed.citations,
    status: "pending_review",
    ai_confidence: confidence,
    prompt_version: GENERATE_PROMPT_VERSION,
    model_used: OUTREACH_LONGFORM_MODEL,
    edit_history: [{ at: new Date().toISOString(), event: "generated", review, revisions, qualityTarget: config.qualityTarget, meetsBar }],
  };
  // Persist the per-article override so future regenerations reuse it. Only set
  // when present so normal generation never touches the (migration-gated) column.
  if (input.configOverride) fields.generation_overrides = input.configOverride;

  let postId: string;
  if (input.placeholderPostId) {
    const { error } = await svc.from("posts").update(fields).eq("id", input.placeholderPostId);
    if (error) throw new Error(`persist post failed: ${error.message}`);
    postId = input.placeholderPostId;
  } else {
    const { data, error } = await svc.from("posts").insert(fields).select("id").single();
    if (error) throw new Error(`persist post failed: ${error.message}`);
    postId = data.id as string;
  }

  if (input.seedId) {
    await svc
      .from("content_seeds")
      .update({ consumed: true, consumed_at: new Date().toISOString(), consumed_in_post_id: postId })
      .eq("id", input.seedId);
  }
  await recordOutreachAudit({
    actorId: input.actorId,
    action: "post.generated",
    targetType: "post",
    targetId: postId,
    metadata: { pillar: input.pillarName, qc_passed: review.passed, confidence, revisions, meetsBar, seedId: input.seedId ?? null },
  });
  return postId;
}

export interface QualityReview {
  passed: boolean;
  confidence: number;
  breakdown: { criterion: string; score: number; note?: string }[];
  issues: { severity: string; note: string }[];
}

/** Run only the quality-check on an existing draft (no generation/revision).
 * Used by the "re-score" action to explain a draft's score on demand. */
export async function runQualityCheck(
  draft: Record<string, unknown>,
  qualityCheckPrompt: string,
): Promise<QualityReview> {
  return callTool({
    model: OUTREACH_MEDIUM_MODEL,
    system: qualityCheckPrompt + QC_BREAKDOWN_INSTRUCTION,
    user: JSON.stringify(draft),
    toolName: "review_post",
    toolDescription: "Audit the draft and return a verdict with a per-criterion breakdown.",
    inputSchema: REVIEW_TOOL_SCHEMA,
    schema: reviewSchema,
    purpose: "quality_check",
  });
}

// ---- JSON tool schemas (Anthropic input_schema) ---------------------------
const COMPOSE_TOOL_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    body_long: { type: "string" },
    body_medium: { type: "string" },
    body_short: { type: "string" },
    body_thread: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: { n: { type: "integer" }, label: { type: "string" }, url: { type: "string" } },
        required: ["n", "label"],
      },
    },
    ai_confidence: { type: "number" },
  },
  required: ["title", "body_long", "body_medium", "body_short", "body_thread", "hashtags", "citations", "ai_confidence"],
};

const REVIEW_TOOL_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    confidence: { type: "number" },
    breakdown: {
      type: "array",
      description: "Per-criterion scores: one entry per rubric dimension evaluated.",
      items: {
        type: "object",
        properties: { criterion: { type: "string" }, score: { type: "number" }, note: { type: "string" } },
        required: ["criterion", "score"],
      },
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: { severity: { type: "string", enum: ["blocker", "warning"] }, note: { type: "string" } },
        required: ["severity", "note"],
      },
    },
  },
  required: ["passed", "confidence", "breakdown", "issues"],
};
