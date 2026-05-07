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

function buildUserPrompt(input: GenerateInput): string {
  const pillar = PILLARS[input.pillar];
  const wordTarget = input.wordTarget ?? 3500;
  const keywords = input.keywords?.length
    ? `\n- Target keywords (weave in naturally, do not stuff): ${input.keywords.join(", ")}`
    : "";
  const extra = input.extraContext?.trim()
    ? `\n\n## Extra context from the founder\n${input.extraContext.trim()}`
    : "";

  return `Write a long-form article for intelle.io.

## Topic
${input.topic}

## Pillar
${input.pillar} — ${pillar.label}
${pillar.guidance}

## Targets
- Word count: ${wordTarget} words (acceptable range: ${Math.round(wordTarget * 0.9)}-${Math.round(wordTarget * 1.1)})${keywords}${extra}

Now produce the article and the LinkedIn + Twitter variants by calling the save_generated_article tool. The body is markdown, H2/H3 only, ends with Key Takeaways + italicised CTA. Do not include the title in the body.`;
}

export async function generateArticle(
  input: GenerateInput
): Promise<GenerateResult> {
  const client = getAnthropic();
  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.create({
    model: ARTICLE_MODEL,
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: ARTICLE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SAVE_TOOL],
    tool_choice: { type: "tool", name: SAVE_TOOL.name },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find(
    (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Model did not call save_generated_article tool");
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
