import OpenAI, { toFile } from "openai";
import { isCustomerIsolationEnabled, getIntelleAsrConfig } from "./config";

/**
 * Speech-to-text for CUSTOMER audio (evidence video soundtracks, reviewer voice
 * notes). Routes to the self-hosted intelleLLM ASR endpoint when isolation is on;
 * otherwise uses OpenAI Whisper (today's behavior).
 *
 * Both targets speak the OpenAI /audio API, so the same SDK code runs against
 * either client — only the base URL + model change. Fail-closed: when isolation
 * is ON but the ASR endpoint isn't configured, we THROW rather than fall back to
 * OpenAI, so customer audio never leaks to a third party.
 */

export interface AsrResult {
  text: string;
  segments?: { start: number; end: number; text: string }[];
}

/** Is transcription available given the current mode (self-hosted or OpenAI)? */
export function isAsrConfigured(): boolean {
  if (isCustomerIsolationEnabled()) return !!getIntelleAsrConfig().baseUrl;
  return !!process.env.OPENAI_API_KEY;
}

function asrClientAndModel(): { client: OpenAI; model: string } {
  if (isCustomerIsolationEnabled()) {
    const cfg = getIntelleAsrConfig();
    if (!cfg.baseUrl) {
      throw new Error(
        "INTELLELLM_ENABLED is true but INTELLE_ASR_BASE_URL is not set — refusing to send customer audio to a third party.",
      );
    }
    return {
      client: new OpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey ?? "intellellm" }),
      model: cfg.model ?? "whisper-1",
    };
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: "whisper-1",
  };
}

export async function transcribeAudio(args: {
  audio: Buffer;
  fileName: string;
  mimeType?: string;
  /** "translate" returns English regardless of source language. */
  mode?: "transcribe" | "translate";
  /** Request segment timestamps (transcribe mode only). */
  segments?: boolean;
}): Promise<AsrResult> {
  const { client, model } = asrClientAndModel();
  const file = await toFile(
    args.audio,
    args.fileName,
    args.mimeType ? { type: args.mimeType } : undefined,
  );

  if (args.mode === "translate") {
    const res = await client.audio.translations.create({ file, model });
    return { text: ((res as { text?: string }).text ?? "").trim() };
  }

  const res = await client.audio.transcriptions.create({
    file,
    model,
    response_format: args.segments ? "verbose_json" : "json",
    ...(args.segments ? { timestamp_granularities: ["segment"] } : {}),
  });
  const any = res as unknown as {
    text?: string;
    segments?: { start: number; end: number; text: string }[];
  };
  return { text: (any.text ?? "").trim(), segments: any.segments };
}
