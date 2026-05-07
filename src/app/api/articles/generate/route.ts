import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateArticle } from "@/lib/content/generate";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({
  topic: z.string().min(8),
  pillar: z.enum(PILLAR_KEYS as [string, ...string[]]),
  keywords: z.array(z.string()).optional(),
  wordTarget: z.number().int().min(800).max(6000).optional(),
  extraContext: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageContent(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await generateArticle({
      topic: parsed.data.topic,
      pillar: parsed.data.pillar as never,
      keywords: parsed.data.keywords,
      wordTarget: parsed.data.wordTarget,
      extraContext: parsed.data.extraContext,
    });
  } catch (err) {
    console.error("[generate] Anthropic error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 }
    );
  }

  const { article, metadata } = result;
  const slug = await ensureUniqueSlug(article.slug);

  const service = createServiceClient();
  const { data: row, error: dbError } = await service
    .from("articles")
    .insert({
      slug,
      title: article.title,
      body: article.body,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags,
      author_name: "intelle.io",
      status: "draft",
      pillar: parsed.data.pillar,
      meta_description: article.meta_description,
      seo_keywords: article.seo_keywords,
      linkedin_body: article.linkedin_body
        .replaceAll("<slug>", slug)
        .replaceAll(`intelle.io/insights/${article.slug}`, `intelle.io/insights/${slug}`),
      twitter_body: article.twitter_body
        .replaceAll("<slug>", slug)
        .replaceAll(`intelle.io/insights/${article.slug}`, `intelle.io/insights/${slug}`),
      generation_prompt: JSON.stringify(parsed.data),
      generation_metadata: metadata,
    })
    .select()
    .single();

  if (dbError) {
    console.error("[generate] DB insert error:", dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(row, { status: 201 });
}

async function ensureUniqueSlug(candidate: string): Promise<string> {
  const service = createServiceClient();
  const base = candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";

  let slug = base;
  let n = 2;
  while (true) {
    const { data } = await service
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n++}`;
    if (n > 50) return `${base}-${Date.now()}`;
  }
}
