import { ARTICLE_MODEL, getAnthropic } from "@/lib/anthropic/client";
import { ARTICLE_SYSTEM_PROMPT } from "./system-prompt";
import { PILLARS } from "./pillars";
import type { ArticlePillar } from "@/lib/types";

export type GenerateInput = {
  topic: string;
  pillar: ArticlePillar;
  keywords?: string[];
  wordTarget?: number;
  extraContext?: string;
  /** Up to 2 reference articles (full markdown) shown to the model as quality/style examples. */
  exampleArticles?: string[];
};

export type GeneratedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  meta_description: string;
  seo_keywords: string[];
  category: "insight" | "case-study" | "whitepaper" | "news";
  tags: string[];
  linkedin_body: string;
  twitter_body: string;
};

export type GenerateResult = {
  article: GeneratedArticle;
  metadata: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
    stop_reason: string | null;
  };
};

const SAVE_TOOL = {
  name: "save_generated_article",
  description:
    "Save the generated article and its social variants. All fields are required.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Headline. 50-90 characters. No quotes." },
      slug: {
        type: "string",
        description:
          "kebab-case URL slug. 3-6 words. Lowercase. No stop words. No year unless time-bound.",
      },
      excerpt: {
        type: "string",
        description: "1-2 sentence card preview, max 220 chars.",
      },
      body: {
        type: "string",
        description:
          "Full markdown body. Use H2/H3 only (no H1). Hits requested word target ±10%. Ends with 'Key Takeaways' section + italicised CTA.",
      },
      meta_description: {
        type: "string",
        description: "140-160 chars. SEO meta description with primary keyword.",
      },
      seo_keywords: {
        type: "array",
        items: { type: "string" },
        description: "5-8 multi-word search phrases.",
      },
      category: {
        type: "string",
        enum: ["insight", "case-study", "whitepaper", "news"],
        description: "Map: founder_pov/industry_insight=insight; case_archetype=case-study; resource/long-form=whitepaper; news rarely.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "5-8 lowercase tags, no #, hyphenated where multi-word.",
      },
      linkedin_body: {
        type: "string",
        description:
          "220-320 word LinkedIn post. Hook first line. No hashtags inline. Ends with 'Read the full piece -> intelle.io/insights/<slug>'.",
      },
      twitter_body: {
        type: "string",
        description:
          "<=270 chars. One sharp claim. Ends with 'intelle.io/insights/<slug>'. No hashtags inside count.",
      },
    },
    required: [
      "title",
      "slug",
      "excerpt",
      "body",
      "meta_description",
      "seo_keywords",
      "category",
      "tags",
      "linkedin_body",
      "twitter_body",
    ],
    additionalProperties: false,
  },
};

function buildExamplesBlock(examples: string[] | undefined): string {
  const cleaned = (examples ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .slice(0, 2);
  if (!cleaned.length) return "";
  const blocks = cleaned
    .map(
      (e, i) => `<example index="${i + 1}">
${e}
</example>`
    )
    .join("\n\n");
  return `\n\n<reference_articles note="Match the structure, paragraph rhythm, density, and quality bar of these. Do NOT copy phrasing or content. Use them only as style and quality references.">
${blocks}
</reference_articles>`;
}

function buildUserPrompt(input: GenerateInput): string {
  const pillar = PILLARS[input.pillar];
  const wordTarget = input.wordTarget ?? 3500;
  const minWords = Math.round(wordTarget * 0.9);
  const maxWords = Math.round(wordTarget * 1.1);

  const keywordsBlock = input.keywords?.length
    ? `\n  <keywords note="Weave in naturally. Do not stuff.">${input.keywords.join(", ")}</keywords>`
    : "";
  const extraBlock = input.extraContext?.trim()
    ? `\n  <extra_context>${input.extraContext.trim()}</extra_context>`
    : "";

  const examplesBlock = buildExamplesBlock(input.exampleArticles);

  return `<task>
Write a long-form article for intelle.io and the paired LinkedIn + X variants.
</task>

<inputs>
  <topic>${input.topic}</topic>
  <pillar key="${input.pillar}" label="${pillar.label}">${pillar.guidance}</pillar>
  <word_target min="${minWords}" max="${maxWords}">${wordTarget}</word_target>${keywordsBlock}${extraBlock}
</inputs>${examplesBlock}

<instructions>
1. Run the &lt;thinking_process&gt; from the system prompt in full, in order — named_reader, sharp_claim, contrarian_angle, article_skeleton, evidence_inventory, social_distillation, reference_calibration. Do not start writing the body until all seven steps are concrete. Vague answers at this stage produce a vague article.
2. Write the body in markdown using H2/H3 only. No H1. No title at the top. Every section advances the sharp_claim.
3. End the body with a "## Key Takeaways" section (4-6 bullets) followed by an italicised CTA paragraph linking to a relevant service page and /book.
4. Hit the word target (${wordTarget} ±10%).
5. Produce LinkedIn and X variants per the system prompt's specs — both derived from social_distillation, not paraphrased from the body.
6. Call the save_generated_article tool with all required fields. The tool call IS the deliverable — any prose written outside the tool call will be discarded. Do not output anything outside the tool call.
</instructions>`;
}

export async function generateArticle(
  input: GenerateInput
): Promise<GenerateResult> {
  const client = getAnthropic();
  const userPrompt = buildUserPrompt(input);

  // Opus 4.7 uses adaptive thinking with output_config.effort instead of the
  // older enabled+budget_tokens API. tool_choice must remain "auto" because
  // thinking forbids forced tool use. Streaming is required because the
  // request can cross the SDK's 10-min guardrail.
  const stream = client.messages.stream({
    model: ARTICLE_MODEL,
    max_tokens: 24000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: [
      {
        type: "text",
        text: ARTICLE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SAVE_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  } as Parameters<typeof client.messages.stream>[0]);
  const response = await stream.finalMessage();

  const toolUse = response.content.find(
    (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) {
    const textBlocks = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    throw new Error(
      `Model did not call save_generated_article tool. Stop reason: ${response.stop_reason}. ` +
        `Text response (truncated): ${textBlocks.slice(0, 500)}`
    );
  }
  const article = toolUse.input as GeneratedArticle;

  const usage = response.usage as typeof response.usage & {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };

  return {
    article,
    metadata: {
      model: response.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      stop_reason: response.stop_reason,
    },
  };
}
