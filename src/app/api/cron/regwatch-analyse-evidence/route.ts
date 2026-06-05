import { NextResponse } from "next/server";
import { runEvidenceAnalysisBatch } from "@/lib/regwatch/evidence-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Evidence analysis cron. Drains obligation_evidence_files rows in
 * analysis_status='pending' and runs Claude (with native PDF input,
 * pdf-parse text fallback for big PDFs, mammoth for DOCX, vision for
 * images) to produce structured findings via tool-use.
 *
 * Phase A: documents + images. Video routes return analysis_status='skipped'
 * with a marker error until Phase C wires the ffmpeg + Whisper path.
 *
 * Auth: Bearer-token contract shared with other regwatch crons.
 *
 * Query params:
 *   ?batch=N  — rows to process this invocation (default 6, max 20).
 *               Six keeps a tick under 60s in the common case (3-10s per
 *               file for documents + images; videos skip immediately).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "6", 10) || 6, 1),
    20,
  );

  const result = await runEvidenceAnalysisBatch(batchSize);

  return NextResponse.json({
    ok: true,
    batch_size: batchSize,
    ...result,
  });
}
