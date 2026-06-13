import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { getCustomerLLM } from "@/lib/llm/gateway";
import { EVIDENCE_ANALYSIS_MODEL } from "./anthropic/models";
import { createServiceClient } from "./supabase/service";
import type {
  EvidenceFindingSeverity,
  EvidenceAnalysisSignal,
  EvidenceFileKind,
} from "./evidence";

/**
 * Evidence analysis pipeline. Routes by file_kind:
 *
 *   document → Claude Sonnet with native PDF input when ≤32MB ≤100 pages;
 *              falls back to pdf-parse text extraction for big PDFs,
 *              mammoth for DOCX, raw text otherwise.
 *   image    → Claude Sonnet vision, one image per request.
 *   video    → Phase C; returns 'skipped' until then (or with an Enterprise
 *              gate error for orgs without the tier).
 *
 * Structured output forced via tool-use — Claude must call `record_findings`
 * with a Zod-schema-validated payload. Same pattern as the briefing pipeline.
 */

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

// Truncating string parsers — Claude routinely exceeds tight caps when it
// has more to say. We accept generous upper bounds but still cap so a
// runaway response can't blow the DB column or the UI render. Transforms
// run AFTER validation so over-cap strings get silently trimmed instead
// of rejected — the prior failure mode was an entire analysis throwing
// away because `summary` exceeded an arbitrary 800-char limit.
const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

const findingSchema = z.object({
  id: z.string(),
  title: cappedString(400),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  anchor: cappedString(600).nullable().optional(),
  regulation_citation_anchor: cappedString(300).nullable().optional(),
  explanation: cappedString(4000),
  suggested_action: cappedString(1000).nullable().optional(),
});

const recordFindingsSchema = z.object({
  summary: cappedString(4000),
  overall_signal: z.enum([
    "looks-compliant",
    "concerns",
    "non-compliant",
    "inconclusive",
  ]),
  overall_confidence: z.number().min(0).max(1),
  findings: z.array(findingSchema).max(30),
});

type RecordFindings = z.infer<typeof recordFindingsSchema>;

const RECORD_FINDINGS_TOOL = {
  name: "record_findings",
  description:
    "Record your analysis of the evidence file against the obligation's regulation. Always call this tool exactly once at the end of your analysis.",
  input_schema: {
    type: "object" as const,
    required: ["summary", "overall_signal", "overall_confidence", "findings"],
    properties: {
      summary: {
        type: "string" as const,
        description:
          "Plain-English summary of what the evidence shows and how well it supports compliance with the regulation. Aim for 1-2 paragraphs (around 400-1500 chars); the parser truncates above 4000.",
      },
      overall_signal: {
        type: "string" as const,
        enum: [
          "looks-compliant",
          "concerns",
          "non-compliant",
          "inconclusive",
        ],
        description:
          "Bucket your overall read: looks-compliant (evidence supports compliance), concerns (some gaps but generally OK), non-compliant (clear discrepancy), inconclusive (insufficient information).",
      },
      overall_confidence: {
        type: "number" as const,
        description: "0..1 — your confidence in the overall_signal.",
      },
      findings: {
        type: "array" as const,
        maxItems: 20,
        items: {
          type: "object" as const,
          required: [
            "id",
            "title",
            "severity",
            "confidence",
            "explanation",
          ],
          properties: {
            id: {
              type: "string" as const,
              description: "Short slug like 'f-001'.",
            },
            title: { type: "string" as const, maxLength: 400 },
            severity: {
              type: "string" as const,
              enum: ["info", "low", "medium", "high", "critical"],
            },
            confidence: { type: "number" as const, minimum: 0, maximum: 1 },
            anchor: {
              type: ["string", "null"] as const,
              description:
                "Where in the evidence this came from — e.g. 'page 3, paragraph 4' for docs, 'upper-right corner near valve handle' for images.",
            },
            regulation_citation_anchor: {
              type: ["string", "null"] as const,
              description:
                "Which clause/section of the regulation this discrepancy ties to, e.g. 'Article 6(2)'.",
            },
            explanation: {
              type: "string" as const,
              maxLength: 4000,
            },
            suggested_action: {
              type: ["string", "null"] as const,
              maxLength: 1000,
            },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Job runner — one row at a time. The cron loops over a batch.
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  ok: boolean;
  /** Status to write to the row. */
  status: "completed" | "failed" | "skipped";
  payload?: RecordFindings;
  model: string;
  tokenUsage?: Record<string, unknown>;
  error?: string;
  /** Video-only: Whisper transcript persisted to analysis_transcript. */
  transcript?: string;
  /** Video-only: frames sampled. */
  keyframeCount?: number;
  /** Video-only: source video duration in seconds. */
  videoDurationSec?: number;
}

export interface EvidenceJobInput {
  evidenceFileId: string;
  obligationId: string;
  organizationId: string;
  filePath: string;
  fileName: string;
  fileKind: EvidenceFileKind;
  mimeType: string | null;
}

/**
 * Run analysis for one evidence file. Pulls the obligation + regulation
 * text to ground the analysis, downloads the file from storage, routes
 * by kind, and returns the structured output (or a failure to record).
 */
export async function analyseOneEvidenceFile(
  job: EvidenceJobInput,
): Promise<AnalysisResult> {
  const svc = createServiceClient();

  // 1. Load grounding context: the obligation's regulation + clause.
  const { data: obligation } = await svc
    .from("compliance_obligations")
    .select(
      `id, severity, compliance_status, clause_anchor, clause_text,
       regulatory_item_id,
       regulation:regulatory_items ( citation, title, body_text, summary, source_url, regulator:regulators!inner ( name, short_name ) )`,
    )
    .eq("id", job.obligationId)
    .maybeSingle();
  if (!obligation) {
    return {
      ok: false,
      status: "failed",
      model: EVIDENCE_ANALYSIS_MODEL,
      error: "Obligation not found",
    };
  }
  const reg = Array.isArray(obligation.regulation)
    ? obligation.regulation[0]
    : obligation.regulation;
  const regulator = reg
    ? Array.isArray(reg.regulator)
      ? reg.regulator[0]
      : reg.regulator
    : null;

  const regulationContext = reg
    ? `Regulation: ${reg.citation} — ${reg.title}\nRegulator: ${regulator?.short_name ?? regulator?.name ?? "Unknown"}\nSource: ${reg.source_url}\n\nBody (excerpt):\n${(reg.body_text ?? reg.summary ?? "").slice(0, 6000)}`
    : "(No regulation pinned to this obligation.)";

  const clauseContext = obligation.clause_anchor
    ? `Clause pinned: ${obligation.clause_anchor}${obligation.clause_text ? `\n\nClause text:\n${obligation.clause_text}` : ""}`
    : "(No specific clause pinned — analyse against the regulation as a whole.)";

  // 2. Download the file.
  const { data: dl, error: dlErr } = await svc.storage
    .from("regwatch-documents")
    .download(job.filePath);
  if (dlErr || !dl) {
    return {
      ok: false,
      status: "failed",
      model: EVIDENCE_ANALYSIS_MODEL,
      error: dlErr?.message ?? "Could not download file from storage",
    };
  }

  // 3. Route by file_kind.
  if (job.fileKind === "video") {
    const { analyseVideoEvidence } = await import("./evidence-video-analysis");
    const videoResult = await analyseVideoEvidence({
      blob: dl,
      fileName: job.fileName,
      organizationId: job.organizationId,
      regulationContext,
      clauseContext,
      // The video module reuses our Claude tool-use call so the schema
      // stays in lockstep with the doc/image path.
      recordFindings: async ({ client, model, content }) => {
        const r = await runClaudeAnalysis({
          client,
          model,
          regulationContext,
          clauseContext,
          fileLabel: job.fileName,
          content: content as unknown[],
        });
        return {
          ok: r.ok,
          status: r.status === "skipped" ? "failed" : r.status,
          payload: r.payload,
          tokenUsage: r.tokenUsage,
          error: r.error,
        };
      },
    });
    return {
      ok: videoResult.ok,
      status: videoResult.status,
      payload: videoResult.payload as RecordFindings | undefined,
      model: videoResult.model,
      tokenUsage: videoResult.tokenUsage,
      error: videoResult.error,
      transcript: videoResult.transcript,
      keyframeCount: videoResult.keyframeCount,
      videoDurationSec: videoResult.videoDurationSec,
    };
  }

  if (job.fileKind === "image") {
    return await analyseImage(dl, job, regulationContext, clauseContext);
  }

  // document
  return await analyseDocument(dl, job, regulationContext, clauseContext);
}

// ---------------------------------------------------------------------------
// Document analysis
// ---------------------------------------------------------------------------

const MAX_PDF_BYTES_FOR_NATIVE = 32 * 1024 * 1024; // Anthropic native PDF cap

async function analyseDocument(
  blob: Blob,
  job: EvidenceJobInput,
  regulationContext: string,
  clauseContext: string,
): Promise<AnalysisResult> {
  const mime = (job.mimeType ?? "").toLowerCase();
  const isPdf = mime === "application/pdf" || job.fileName.toLowerCase().endsWith(".pdf");
  const isDocx =
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    job.fileName.toLowerCase().endsWith(".docx");

  const { client, model } = getCustomerLLM(EVIDENCE_ANALYSIS_MODEL);
  const arrayBuffer = await blob.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  // Native PDF input when it'll fit.
  if (isPdf && buf.length <= MAX_PDF_BYTES_FOR_NATIVE) {
    const base64 = buf.toString("base64");
    return runClaudeAnalysis({
      client,
      model,
      regulationContext,
      clauseContext,
      fileLabel: job.fileName,
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        },
        {
          type: "text",
          text: documentUserPrompt({
            regulationContext,
            clauseContext,
            fileLabel: job.fileName,
            extractedText: null,
          }),
        },
      ],
    });
  }

  // Text-extraction fallbacks for big PDFs / DOCX / plain text.
  let extracted = "";
  try {
    if (isPdf) {
      // unpdf — modern pdfjs-dist v4 legacy build wrapped for Node /
      // serverless. Replaces pdf-parse (which used a 2017-era pdfjs
      // that couldn't read PDFs generated by @react-pdf/renderer).
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      extracted = Array.isArray(text) ? text.join("\n") : (text ?? "");
    } else if (isDocx) {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer: buf });
      extracted = parsed.value ?? "";
    } else {
      extracted = buf.toString("utf8");
    }
  } catch (e) {
    return {
      ok: false,
      status: "failed",
      model,
      error: `Text extraction failed: ${(e as Error).message}`,
    };
  }

  // Trim to a sensible context window — Sonnet handles huge inputs but we
  // don't want to send a 1MB SOP if 60KB is enough for the analysis.
  const MAX_CHARS = 200_000;
  if (extracted.length > MAX_CHARS) extracted = extracted.slice(0, MAX_CHARS);

  if (extracted.trim().length < 50) {
    return {
      ok: false,
      status: "failed",
      model,
      error:
        "Could not extract enough text from the document. Try a PDF re-export or use an image upload of the page instead.",
    };
  }

  return runClaudeAnalysis({
    client,
    model,
    regulationContext,
    clauseContext,
    fileLabel: job.fileName,
    content: [
      {
        type: "text",
        text: documentUserPrompt({
          regulationContext,
          clauseContext,
          fileLabel: job.fileName,
          extractedText: extracted,
        }),
      },
    ],
  });
}

function documentUserPrompt(args: {
  regulationContext: string;
  clauseContext: string;
  fileLabel: string;
  extractedText: string | null;
}): string {
  return `# Regulation context
${args.regulationContext}

# Clause context
${args.clauseContext}

# Evidence file
File: ${args.fileLabel}
${args.extractedText ? `\nExtracted text:\n${args.extractedText}` : "\nThe file is attached above as a PDF document — read it directly."}

# Task
You are analysing this evidence against the regulation/clause above to support a human reviewer's compliance assessment. Identify discrepancies, missing required elements, ambiguities, contradictions, and anything that would make a regulator or auditor question whether the evidence supports compliance. Be specific — cite paragraphs / pages / sections of the evidence and clauses of the regulation when you can. Don't invent: if the file is too thin to assess, return overall_signal='inconclusive' and explain what's missing.

Call the record_findings tool exactly once.`;
}

// ---------------------------------------------------------------------------
// Image analysis
// ---------------------------------------------------------------------------

async function analyseImage(
  blob: Blob,
  job: EvidenceJobInput,
  regulationContext: string,
  clauseContext: string,
): Promise<AnalysisResult> {
  const { client, model } = getCustomerLLM(EVIDENCE_ANALYSIS_MODEL);
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = (job.mimeType ?? "image/jpeg").toLowerCase();
  // Claude vision accepts image/jpeg, image/png, image/gif, image/webp.
  const allowedMime: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
    mime.includes("png")
      ? "image/png"
      : mime.includes("webp")
        ? "image/webp"
        : mime.includes("gif")
          ? "image/gif"
          : "image/jpeg";

  return runClaudeAnalysis({
    client,
    model,
    regulationContext,
    clauseContext,
    fileLabel: job.fileName,
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: allowedMime,
          data: base64,
        },
      },
      {
        type: "text",
        text: imageUserPrompt({
          regulationContext,
          clauseContext,
          fileLabel: job.fileName,
        }),
      },
    ],
  });
}

function imageUserPrompt(args: {
  regulationContext: string;
  clauseContext: string;
  fileLabel: string;
}): string {
  return `# Regulation context
${args.regulationContext}

# Clause context
${args.clauseContext}

# Evidence image
File: ${args.fileLabel}
The image is attached above. Look at it directly.

# Task
Describe what's in the image briefly, then identify anything that would help OR hurt the compliance assessment: visible labels, signage, equipment condition, PPE, missing required markings, safety violations, date stamps that don't match the obligation period, etc. When citing a discrepancy, anchor it to a region of the image (e.g. "upper-left near the pressure gauge"). Don't speculate beyond what you can see — return 'inconclusive' if the image isn't clear enough to assess.

Call the record_findings tool exactly once.`;
}

// ---------------------------------------------------------------------------
// Shared Claude call + tool-use response parser
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an evidence-review assistant for intelle.io RegWatch — a compliance product. A reviewer has uploaded a piece of evidence (document, image, or video frame) to support their assessment that an asset complies with a specific regulation. Your job: tell the admin who signs off on the review whether the evidence actually supports compliance, and flag anything that doesn't.

Guidelines:
- Be specific. Cite paragraphs, page numbers, image regions, and clauses by name.
- Severity scale: info (no compliance impact), low (minor gap), medium (notable gap), high (material discrepancy), critical (safety/legal violation).
- Confidence on each finding is your honest 0..1 read — high confidence only when you can directly cite the evidence and the regulation.
- Don't hallucinate. If the evidence is too thin / poor-quality / out-of-scope, say so via overall_signal='inconclusive'.
- Always call the record_findings tool exactly once.`;

interface RunArgs {
  /** Anthropic client — real Claude, or the intelleLLM-fronting client. */
  client: ReturnType<typeof getAnthropic>;
  /** Model id to use on that client. */
  model: string;
  regulationContext: string;
  clauseContext: string;
  fileLabel: string;
  // anthropic's content-block union type is large; we accept whatever the
  // caller built and pass through unchanged.
  content: unknown[];
}

async function runClaudeAnalysis(args: RunArgs): Promise<AnalysisResult> {
  try {
    const message = await args.client.messages.create({
      model: args.model,
      max_tokens: 2200,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        RECORD_FINDINGS_TOOL as unknown as {
          name: string;
          description: string;
          input_schema: { type: "object" };
        },
      ],
      tool_choice: { type: "tool", name: "record_findings" },
      messages: [
        {
          role: "user",
          content: args.content as never,
        },
      ],
    });

    // Find the tool use block.
    const toolUseBlock = message.content.find(
      (b) => b.type === "tool_use",
    );
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return {
        ok: false,
        status: "failed",
        model: args.model,
        error: "Model did not call record_findings tool",
        tokenUsage: usageDict(message.usage),
      };
    }

    const parsed = recordFindingsSchema.safeParse(toolUseBlock.input);
    if (!parsed.success) {
      return {
        ok: false,
        status: "failed",
        model: args.model,
        error: `Tool input did not match schema: ${parsed.error.issues[0]?.message}`,
        tokenUsage: usageDict(message.usage),
      };
    }

    return {
      ok: true,
      status: "completed",
      payload: parsed.data,
      model: args.model,
      tokenUsage: usageDict(message.usage),
    };
  } catch (e) {
    return {
      ok: false,
      status: "failed",
      model: args.model,
      error: `Model call failed: ${(e as Error).message}`,
    };
  }
}

function usageDict(
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number | null;
        cache_read_input_tokens?: number | null;
      }
    | undefined
    | null,
): Record<string, unknown> {
  if (!usage) return {};
  return {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cache_write: usage.cache_creation_input_tokens ?? 0,
    cache_read: usage.cache_read_input_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Batch driver — drains the queue, called from the cron route
// ---------------------------------------------------------------------------

export interface BatchResult {
  considered: number;
  completed: number;
  skipped: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

export async function runEvidenceAnalysisBatch(
  batchSize = 6,
): Promise<BatchResult> {
  const started = Date.now();
  const result: BatchResult = {
    considered: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    duration_ms: 0,
  };
  const svc = createServiceClient();

  const { data: rows, error } = await svc
    .from("obligation_evidence_files")
    .select(
      "id, organization_id, obligation_id, file_path, file_name, mime_type, file_kind",
    )
    .eq("analysis_status", "pending")
    .order("uploaded_at", { ascending: true })
    .limit(batchSize);
  if (error) {
    result.errors.push(`queue read: ${error.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  const jobs = rows ?? [];
  result.considered = jobs.length;
  if (jobs.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }

  for (const r of jobs) {
    // Mark processing so we don't double-pick.
    await svc
      .from("obligation_evidence_files")
      .update({
        analysis_status: "processing",
        analysis_started_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    const job: EvidenceJobInput = {
      evidenceFileId: r.id as string,
      obligationId: r.obligation_id as string,
      organizationId: r.organization_id as string,
      filePath: r.file_path as string,
      fileName: r.file_name as string,
      fileKind: r.file_kind as EvidenceFileKind,
      mimeType: (r.mime_type as string | null) ?? null,
    };

    const analysis = await analyseOneEvidenceFile(job);

    if (analysis.ok && analysis.status === "completed" && analysis.payload) {
      const findingsWithIds = analysis.payload.findings.map((f, idx) => ({
        ...f,
        id: f.id || `f-${String(idx + 1).padStart(3, "0")}`,
      }));
      await svc
        .from("obligation_evidence_files")
        .update({
          analysis_status: "completed",
          analysis_completed_at: new Date().toISOString(),
          analysis_model: analysis.model,
          analysis_summary: analysis.payload.summary,
          analysis_findings: findingsWithIds,
          analysis_overall_signal: analysis.payload
            .overall_signal as EvidenceAnalysisSignal,
          analysis_confidence: analysis.payload.overall_confidence,
          analysis_token_usage: analysis.tokenUsage ?? {},
          analysis_error: null,
          // Video-only fields — undefined for docs/images is fine.
          analysis_transcript: analysis.transcript ?? null,
          analysis_keyframe_count: analysis.keyframeCount ?? null,
          analysis_video_duration_sec:
            analysis.videoDurationSec != null
              ? Math.round(analysis.videoDurationSec)
              : null,
        })
        .eq("id", r.id);
      result.completed += 1;

      // Enqueue the right notification kind.
      const kind =
        findingsWithIds.length > 0
          ? "evidence_analysis_flagged_discrepancy"
          : "evidence_analysis_completed";

      // Find the obligation's reviewer to notify.
      const { data: ob } = await svc
        .from("compliance_obligations")
        .select("assigned_reviewer_user_id, regulatory_item_id")
        .eq("id", job.obligationId)
        .maybeSingle();
      if (ob?.assigned_reviewer_user_id) {
        await svc.from("obligation_notification_queue").insert({
          organization_id: job.organizationId,
          recipient_user_id: ob.assigned_reviewer_user_id,
          kind,
          obligation_id: job.obligationId,
          regulatory_item_id: ob.regulatory_item_id ?? null,
          payload: {
            evidence_file_id: job.evidenceFileId,
            file_name: job.fileName,
            findings_count: findingsWithIds.length,
            overall_signal: analysis.payload.overall_signal,
            summary: analysis.payload.summary,
          },
        });
      }
    } else if (analysis.status === "skipped") {
      await svc
        .from("obligation_evidence_files")
        .update({
          analysis_status: "skipped",
          analysis_completed_at: new Date().toISOString(),
          analysis_model: analysis.model,
          analysis_error: analysis.error ?? null,
        })
        .eq("id", r.id);
      result.skipped += 1;
    } else {
      await svc
        .from("obligation_evidence_files")
        .update({
          analysis_status: "failed",
          analysis_completed_at: new Date().toISOString(),
          analysis_model: analysis.model,
          analysis_error: analysis.error ?? "Unknown failure",
        })
        .eq("id", r.id);
      result.failed += 1;
      if (analysis.error)
        result.errors.push(`${r.id}: ${analysis.error}`);
    }
  }

  result.duration_ms = Date.now() - started;
  return result;
}
