import { NextResponse } from "next/server";
import { runInternalDocEmbedBacklog } from "@/lib/regwatch/internal-document-embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Embeds CUSTOMER documents for hybrid (vector + FTS) company-doc search via the
 * self-hosted intelleLLM embedder. No-ops unless intelleLLM isolation + the
 * embedder are configured (isIntelleEmbedEnabled) — until then company docs stay
 * FTS-only and we never send customer text to a third-party embedder.
 *
 * Auth: Bearer-token contract shared with the other regwatch crons.
 * ?batch=N — documents to embed per invocation (default 10, max 50).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "10", 10) || 10, 1),
    50,
  );

  const result = await runInternalDocEmbedBacklog(batchSize);
  return NextResponse.json({ ok: true, ...result });
}
