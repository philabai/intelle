import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads versioned prompt files (.md) from this directory. Prompts are kept as
 * editable .md (not inline TS) per the build brief. The files are bundled into
 * serverless functions via `outputFileTracingIncludes` in next.config.ts.
 */
const cache = new Map<string, string>();

export type PromptName = "generate_v1" | "quality_check_v1" | "quality_check_v2" | "revise_v1";

export function loadPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const text = readFileSync(
    join(process.cwd(), "src/lib/outreach/prompts", `${name}.md`),
    "utf8",
  );
  cache.set(name, text);
  return text;
}
