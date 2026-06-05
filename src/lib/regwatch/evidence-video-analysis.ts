import { spawn } from "node:child_process";
import { promises as fs, createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import OpenAI from "openai";
import { getAnthropic } from "@/lib/anthropic/client";
import { EVIDENCE_ANALYSIS_MODEL } from "./anthropic/models";
import { createServiceClient } from "./supabase/service";
import { canUseFeature } from "./tier";
import type { Tier } from "./stripe";

/**
 * Video evidence analysis pipeline.
 *
 *   1. Tier + env gate: evidence_video_analysis (Enterprise) feature must
 *      be enabled for the org AND OPENAI_API_KEY must be set. Either gate
 *      failing → return skipped (Phase A's stub semantics) with a marker
 *      so the UI can render the right "upgrade" / "config missing" copy.
 *   2. Write the source video to /tmp.
 *   3. Run ffmpeg twice in parallel: keyframe extraction at 1fps capped at
 *      60 frames, and audio demux to 16kHz mono mp3 for Whisper. Both
 *      capped at the first 60 seconds — anything longer is treated as
 *      out-of-scope for the analysis budget.
 *   4. Send audio to OpenAI Whisper (verbose_json + segment timestamps).
 *   5. Batch frames into groups of 10 → Claude Sonnet vision summarises
 *      each batch with timestamp anchors.
 *   6. Aggregator pass: Claude Sonnet over the per-batch summaries + the
 *      transcript, with forced tool-use on record_findings (same tool
 *      schema as the doc/image analyser).
 *   7. Clean up /tmp.
 *
 * Returns the same AnalysisResult shape the doc/image analyser does, with
 * three extra fields the batch driver persists: transcript, keyframeCount,
 * videoDurationSec.
 */

const FFMPEG_TIMEOUT_MS = 90_000;
const VIDEO_ANALYSE_SECONDS_CAP = 60;
const FRAMES_PER_BATCH = 10;
const MAX_BATCHES = 6;

export interface VideoAnalysisResult {
  ok: boolean;
  status: "completed" | "failed" | "skipped";
  payload?: unknown;
  model: string;
  tokenUsage?: Record<string, unknown>;
  transcript?: string;
  keyframeCount?: number;
  videoDurationSec?: number;
  error?: string;
}

export async function analyseVideoEvidence(opts: {
  blob: Blob;
  fileName: string;
  organizationId: string;
  regulationContext: string;
  clauseContext: string;
  recordFindings: (args: {
    anthropic: ReturnType<typeof getAnthropic>;
    content: { type: "text"; text: string }[];
  }) => Promise<{
    ok: boolean;
    status: "completed" | "failed";
    payload?: unknown;
    tokenUsage?: Record<string, unknown>;
    error?: string;
  }>;
}): Promise<VideoAnalysisResult> {
  // 1. Tier gate.
  const tier = await getOrgTier(opts.organizationId);
  if (!canUseFeature(tier, "evidence_video_analysis")) {
    return {
      ok: true,
      status: "skipped",
      model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
      error:
        "Video evidence analysis is an Enterprise feature. Upgrade your plan to enable.",
    };
  }
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: true,
      status: "skipped",
      model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
      error:
        "Video transcription is not configured — OPENAI_API_KEY is not set on the server.",
    };
  }

  // 2. Working dir.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "regwatch-vid-"));
  try {
    const videoPath = path.join(tmpDir, "input");
    const buf = Buffer.from(await opts.blob.arrayBuffer());
    await fs.writeFile(videoPath, buf);

    // 3. Probe duration via ffmpeg stderr — ffmpeg always prints a Duration
    // line even when no other operation runs. Capped to the analyse budget.
    const sourceDuration = await probeDurationSeconds(videoPath).catch(
      () => null,
    );
    const analyseLength = sourceDuration
      ? Math.min(sourceDuration, VIDEO_ANALYSE_SECONDS_CAP)
      : VIDEO_ANALYSE_SECONDS_CAP;

    // 4. Parallel ffmpeg jobs: keyframes + audio.
    const framesDir = path.join(tmpDir, "frames");
    await fs.mkdir(framesDir);
    const framePattern = path.join(framesDir, "frame-%03d.jpg");
    const audioPath = path.join(tmpDir, "audio.mp3");

    try {
      await Promise.all([
        runFfmpeg([
          "-y",
          "-i",
          videoPath,
          "-t",
          String(analyseLength),
          "-vf",
          "fps=1",
          "-frames:v",
          String(VIDEO_ANALYSE_SECONDS_CAP),
          "-q:v",
          "4",
          framePattern,
        ]),
        runFfmpeg([
          "-y",
          "-i",
          videoPath,
          "-t",
          String(analyseLength),
          "-vn",
          "-ar",
          "16000",
          "-ac",
          "1",
          "-b:a",
          "64k",
          audioPath,
        ]),
      ]);
    } catch (e) {
      return {
        ok: false,
        status: "failed",
        model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
        error: `ffmpeg failed: ${(e as Error).message}`,
        videoDurationSec: sourceDuration ?? undefined,
      };
    }

    // 5. Whisper transcript (best-effort; analysis continues even if it fails).
    let transcript = "";
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const audioStat = await fs.stat(audioPath).catch(() => null);
      if (audioStat && audioStat.size > 0) {
        const trans = await openai.audio.transcriptions.create({
          file: createReadStream(audioPath),
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        });
        // The SDK types whisper-1 return as a string by default; verbose_json
        // gives us segments + text. Type-narrow defensively.
        const transAny = trans as unknown as {
          text?: string;
          segments?: { start: number; end: number; text: string }[];
        };
        if (transAny.segments && transAny.segments.length > 0) {
          transcript = transAny.segments
            .map(
              (s) =>
                `[${formatTimestamp(s.start)}–${formatTimestamp(s.end)}] ${s.text.trim()}`,
            )
            .join("\n");
        } else if (transAny.text) {
          transcript = transAny.text;
        }
      }
    } catch (e) {
      // Don't fail the whole analysis on transcript errors — proceed with
      // frame-only context and tell the model audio was unavailable.
      transcript = `(Audio transcription unavailable: ${(e as Error).message.slice(0, 200)})`;
    }

    // 6. Read frames + batch them.
    const frameFiles = (await fs.readdir(framesDir))
      .filter((f) => f.endsWith(".jpg"))
      .sort();
    if (frameFiles.length === 0) {
      return {
        ok: false,
        status: "failed",
        model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
        error:
          "No keyframes could be extracted. The file may be an audio-only stream or unrecognised codec.",
        videoDurationSec: sourceDuration ?? undefined,
        transcript,
      };
    }

    const batches: string[][] = [];
    for (
      let i = 0;
      i < frameFiles.length && batches.length < MAX_BATCHES;
      i += FRAMES_PER_BATCH
    ) {
      batches.push(frameFiles.slice(i, i + FRAMES_PER_BATCH));
    }

    // 7. Per-batch Claude vision summaries.
    const anthropic = getAnthropic();
    const batchSummaries: string[] = [];
    const totalTokenUsage = {
      input: 0,
      output: 0,
      cache_read: 0,
      cache_write: 0,
    };

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const startSec = b * FRAMES_PER_BATCH;
      const endSec = startSec + batch.length - 1;
      // Build the multi-image content array.
      const images = await Promise.all(
        batch.map(async (fn) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg" as const,
            data: (await fs.readFile(path.join(framesDir, fn))).toString(
              "base64",
            ),
          },
        })),
      );

      try {
        const summary = await anthropic.messages.create({
          model: EVIDENCE_ANALYSIS_MODEL,
          max_tokens: 700,
          messages: [
            {
              role: "user",
              content: [
                ...(images as unknown as never[]),
                {
                  type: "text",
                  text: `These ${batch.length} frames are seconds ${startSec} through ${endSec} of a compliance evidence video. Briefly summarise what's shown across the batch — equipment state, signage / labels visible, PPE, environment, anything compliance-relevant. Keep it tight: one short paragraph. Don't speculate beyond what you can see.`,
                },
              ],
            },
          ],
        });
        const text =
          summary.content[0]?.type === "text"
            ? summary.content[0].text
            : "(no summary returned)";
        batchSummaries.push(
          `[${formatTimestamp(startSec)}–${formatTimestamp(endSec)}] ${text.trim()}`,
        );
        accumulateUsage(totalTokenUsage, summary.usage);
      } catch (e) {
        batchSummaries.push(
          `[${formatTimestamp(startSec)}–${formatTimestamp(endSec)}] (batch failed: ${(e as Error).message.slice(0, 160)})`,
        );
      }
    }

    // 8. Aggregator pass — Claude Sonnet over the per-batch summaries +
    // transcript with forced tool-use on record_findings.
    const aggregatorPrompt = `# Regulation context
${opts.regulationContext}

# Clause context
${opts.clauseContext}

# Evidence video
File: ${opts.fileName}
Duration: ${sourceDuration ? sourceDuration.toFixed(1) : "?"}s (analysed first ${analyseLength}s, ${frameFiles.length} frames sampled)

# Per-batch frame summaries
${batchSummaries.join("\n\n")}

# Audio transcript (timestamped)
${transcript || "(no spoken audio detected)"}

# Task
Based on the per-batch frame summaries above and the audio transcript, analyse whether the video supports compliance with the regulation/clause. For every finding, anchor it to the timestamp range where the issue appears (e.g. "00:24–00:30"). Don't hallucinate beyond what the summaries and transcript show. Call record_findings exactly once.`;

    const aggregator = await opts.recordFindings({
      anthropic,
      content: [{ type: "text", text: aggregatorPrompt }],
    });

    if (!aggregator.ok || aggregator.status !== "completed") {
      return {
        ok: false,
        status: "failed",
        model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
        error: aggregator.error ?? "Aggregator pass failed",
        videoDurationSec: sourceDuration ?? undefined,
        transcript,
      };
    }

    accumulateUsage(totalTokenUsage, normaliseUsage(aggregator.tokenUsage));

    return {
      ok: true,
      status: "completed",
      payload: aggregator.payload,
      model: `${EVIDENCE_ANALYSIS_MODEL}+whisper-1`,
      tokenUsage: totalTokenUsage,
      transcript,
      keyframeCount: frameFiles.length,
      videoDurationSec: sourceDuration ?? undefined,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrgTier(organizationId: string): Promise<Tier> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("organizations")
    .select("tier")
    .eq("id", organizationId)
    .maybeSingle();
  return ((data?.tier as Tier | null) ?? "free") as Tier;
}

function ffmpegBinary(): string {
  // ffmpeg-static exports the absolute path of the bundled binary.
  // It's a CJS module — both default-import and direct-require resolve.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("ffmpeg-static") as string | { default: string };
  return typeof path === "string" ? path : (path.default ?? "");
}

function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const binary = ffmpegBinary();
    if (!binary) {
      reject(new Error("ffmpeg-static binary path is empty"));
      return;
    }
    const proc = spawn(binary, args);
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
    }, FFMPEG_TIMEOUT_MS);
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      // Limit memory.
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`ffmpeg spawn failed: ${e.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-800)}`));
    });
  });
}

async function probeDurationSeconds(filePath: string): Promise<number> {
  // Run a no-op ffmpeg call to read the input — duration is on stderr.
  let stderr = "";
  try {
    stderr = await runFfmpeg(["-i", filePath, "-f", "null", "-"]);
  } catch (e) {
    // ffmpeg returns non-zero on "no output" sometimes; the stderr is still
    // captured and contains the Duration line.
    stderr = (e as Error).message;
  }
  const m = stderr.match(/Duration:\s+(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) throw new Error("could not probe duration");
  const hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const secs = parseFloat(m[3]);
  return hours * 3600 + mins * 60 + secs;
}

function formatTimestamp(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function accumulateUsage(
  target: { input: number; output: number; cache_read: number; cache_write: number },
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number | null;
        cache_read_input_tokens?: number | null;
      }
    | Record<string, unknown>
    | null
    | undefined,
): void {
  if (!usage) return;
  const u = usage as Record<string, unknown>;
  if (typeof u.input_tokens === "number") target.input += u.input_tokens;
  if (typeof u.output_tokens === "number") target.output += u.output_tokens;
  if (typeof u.cache_creation_input_tokens === "number")
    target.cache_write += u.cache_creation_input_tokens;
  if (typeof u.cache_read_input_tokens === "number")
    target.cache_read += u.cache_read_input_tokens;
  // Already-normalised dict from the aggregator's tokenUsage:
  if (typeof u.input === "number") target.input += u.input;
  if (typeof u.output === "number") target.output += u.output;
  if (typeof u.cache_write === "number") target.cache_write += u.cache_write;
  if (typeof u.cache_read === "number") target.cache_read += u.cache_read;
}

function normaliseUsage(
  u: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return u;
}
