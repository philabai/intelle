import { createServiceClient } from "@/lib/outreach/supabase/service";
import { loadPrompt } from "@/lib/outreach/prompts";

/**
 * Live, admin-editable generation settings. The Quality & Prompts page reads
 * and writes this; the generator reads it on every run. Stored as a single row
 * in outreach.generation_config and auto-seeded from the shipped .md defaults
 * on first read. If the table doesn't exist yet (migration not applied), we
 * fall back to the .md defaults so generation keeps working.
 */

export interface QualityCharacteristic {
  id: string;
  label: string;
  /** The instruction appended to the compose prompt when enabled. */
  instruction: string;
  enabled: boolean;
}

export interface GenerationConfig {
  qualityTarget: number;
  maxRevisions: number;
  composePrompt: string;
  qualityCheckPrompt: string;
  revisePrompt: string;
  characteristics: QualityCharacteristic[];
}

/** Optional, toggleable quality levers. The core anti-hallucination rules live
 * in the base compose prompt; these are extra knobs the editor can flip. */
export const DEFAULT_CHARACTERISTICS: QualityCharacteristic[] = [
  { id: "name-instrument", label: "Name the specific regulator + instrument", enabled: true,
    instruction: "Always name the specific regulator and instrument; never refer to “new regulations” generically." },
  { id: "quantified-consequence", label: "Quantify the business consequence", enabled: true,
    instruction: "Quantify the cost/business consequence wherever a credible figure exists; otherwise state the operational impact concretely (timelines, who must act)." },
  { id: "action-list", label: "Include a concrete near-term action list", enabled: true,
    instruction: "Include a short, scannable list (3–5 items) of specific near-term actions for compliance teams." },
  { id: "no-cliches", label: "Ban LinkedIn clichés & filler openers", enabled: true,
    instruction: "Ban LinkedIn-guru clichés and filler openers (e.g. “Here’s the thing”, “Let that sink in”, “In today’s fast-moving landscape”)." },
  { id: "hook-earns-scroll", label: "Hook must earn the scroll", enabled: true,
    instruction: "The first line must stand alone as interesting and make the reader want the next line; no setup/context as the opener." },
  { id: "non-obvious-angle", label: "Lead with a non-obvious implication", enabled: false,
    instruction: "Lead with a non-obvious implication a generalist would miss, not the headline everyone already has." },
  { id: "sentence-economy", label: "Sentence economy (≤30 words)", enabled: false,
    instruction: "No sentence longer than 30 words; cut every word that doesn’t change the meaning." },
  { id: "distinct-variants", label: "Each platform variant makes a distinct point", enabled: false,
    instruction: "Each platform variant must make a distinct point — the X post is not a truncated version of the LinkedIn post." },
  { id: "reader-takeaway", label: "End on a crisp takeaway line", enabled: false,
    instruction: "End the long-form with one crisp “what this means for you” line for the target reader." },
  { id: "recency-framing", label: "Frame around timing / next deadline", enabled: false,
    instruction: "Frame around timing — what is changing now and the next deadline/milestone — rather than evergreen generalities." },
];

export function defaultConfig(): GenerationConfig {
  return {
    qualityTarget: Math.min(0.99, Math.max(0.5, Number(process.env.OUTREACH_QUALITY_TARGET) || 0.95)),
    maxRevisions: Math.max(0, Math.min(3, Number(process.env.OUTREACH_MAX_REVISIONS) || 2)),
    composePrompt: loadPrompt("generate_v2"),
    qualityCheckPrompt: loadPrompt("quality_check_v2"),
    revisePrompt: loadPrompt("revise_v1"),
    characteristics: DEFAULT_CHARACTERISTICS,
  };
}

interface ConfigRow {
  quality_target: number;
  max_revisions: number;
  compose_prompt: string;
  quality_check_prompt: string;
  revise_prompt: string;
  characteristics: QualityCharacteristic[];
}

function fromRow(row: ConfigRow): GenerationConfig {
  return {
    qualityTarget: Number(row.quality_target),
    maxRevisions: Number(row.max_revisions),
    composePrompt: row.compose_prompt,
    qualityCheckPrompt: row.quality_check_prompt,
    revisePrompt: row.revise_prompt,
    characteristics: Array.isArray(row.characteristics) ? row.characteristics : DEFAULT_CHARACTERISTICS,
  };
}

/** Read the live config, seeding the row from defaults on first use. Falls back
 * to .md defaults if the table is missing (pre-migration). */
export async function loadGenerationConfig(): Promise<GenerationConfig> {
  const svc = createServiceClient();
  try {
    const { data, error } = await svc
      .from("generation_config")
      .select("quality_target, max_revisions, compose_prompt, quality_check_prompt, revise_prompt, characteristics")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return fromRow(data as ConfigRow);

    // No row yet — seed from defaults.
    const d = defaultConfig();
    await svc.from("generation_config").insert({
      singleton: true,
      quality_target: d.qualityTarget,
      max_revisions: d.maxRevisions,
      compose_prompt: d.composePrompt,
      quality_check_prompt: d.qualityCheckPrompt,
      revise_prompt: d.revisePrompt,
      characteristics: d.characteristics,
    });
    return d;
  } catch {
    return defaultConfig();
  }
}

/** Build the effective compose system prompt = base + enabled characteristics. */
export function composeSystem(config: GenerationConfig): string {
  const enabled = config.characteristics.filter((c) => c.enabled);
  if (enabled.length === 0) return config.composePrompt;
  const block = enabled.map((c) => `- ${c.instruction}`).join("\n");
  return `${config.composePrompt}\n\n## Additional enabled requirements (configurable)\n${block}`;
}
