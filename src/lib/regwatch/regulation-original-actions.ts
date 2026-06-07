"use server";

import { z } from "zod";
import { createServiceClient } from "./supabase/service";

/**
 * Original-document capture + serve.
 *
 * On first viewer hit the action fetches the regulator's source_url,
 * uploads to the regwatch-public storage bucket under a stable
 * regulator-scoped path, then returns a 1-hour signed URL the
 * RegulationOriginalPane renders. Subsequent hits reuse the cache.
 *
 * Recache: when regulatory_items.last_changed_at advances past
 * original_captured_at the action refetches automatically — no cron
 * needed.
 *
 * Refusals: if the regulator has disallow_original_capture=true (set
 * per-publisher when one objects to redistribution), the action
 * returns sourceUrl so the UI can show "open at source" instead.
 */

const BUCKET = "regwatch-public";
const SIGNED_URL_TTL = 3600; // 1h
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB; matches bucket ceiling

const inputSchema = z.object({ regId: z.string().uuid() });

export interface OriginalDocumentResult {
  ok: boolean;
  error?: string;
  /** Friendly user-facing reason when the original isn't available. */
  reason?: "fetch_failed" | "disallowed" | "too_large" | "no_source";
  signedUrl?: string;
  mime?: string;
  /** Falls back to this when capture is disallowed or failed — open externally. */
  sourceUrl?: string;
  captured?: boolean;
  fromCache?: boolean;
}

export async function getRegulationOriginalDocument(
  input: unknown,
): Promise<OriginalDocumentResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const svc = createServiceClient();

  const { data: row, error: loadErr } = await svc
    .from("regulatory_items")
    .select(
      "id, source_url, source_mime, last_changed_at, original_storage_path, original_mime, original_captured_at, original_capture_error, regulator_id, regulators!inner(disallow_original_capture)",
    )
    .eq("id", parsed.data.regId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, error: loadErr?.message ?? "Regulation not found" };
  }

  // Supabase returns the joined regulators as an array even with !inner.
  const regulatorRows = row.regulators as
    | { disallow_original_capture: boolean | null }[]
    | { disallow_original_capture: boolean | null }
    | null;
  const regulator = Array.isArray(regulatorRows)
    ? regulatorRows[0] ?? null
    : regulatorRows;

  if (regulator?.disallow_original_capture) {
    return {
      ok: true,
      reason: "disallowed",
      sourceUrl: row.source_url as string | null ?? undefined,
    };
  }

  const sourceUrl = (row.source_url as string | null) ?? null;
  if (!sourceUrl) {
    return { ok: false, reason: "no_source", error: "No source URL on record" };
  }

  const cachedPath = row.original_storage_path as string | null;
  const cachedCapturedAt = row.original_captured_at as string | null;
  const lastChangedAt = row.last_changed_at as string | null;

  const cacheValid =
    !!cachedPath &&
    !!cachedCapturedAt &&
    (!lastChangedAt ||
      new Date(cachedCapturedAt).getTime() >= new Date(lastChangedAt).getTime());

  if (cacheValid) {
    const signed = await sign(svc, cachedPath!);
    if (signed) {
      return {
        ok: true,
        signedUrl: signed,
        mime: (row.original_mime as string | null) ?? undefined,
        sourceUrl,
        captured: true,
        fromCache: true,
      };
    }
    // Storage object vanished — fall through to refetch.
  }

  // Fetch + cache.
  const captured = await captureSource(sourceUrl);
  if (!captured.ok) {
    await svc
      .from("regulatory_items")
      .update({
        original_capture_error: captured.error,
        original_captured_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.regId);
    return {
      ok: true,
      reason: captured.reason ?? "fetch_failed",
      error: captured.error,
      sourceUrl,
      captured: false,
    };
  }

  // Decide extension from sniffed mime so the upload path is correct.
  const ext = captured.mime === "application/pdf" ? "pdf" : "html";
  const path = `regulations/${parsed.data.regId}/source.${ext}`;

  if (!captured.bytes) {
    return { ok: false, error: "Captured payload empty", sourceUrl };
  }
  const { error: upErr } = await svc.storage
    .from(BUCKET)
    .upload(path, captured.bytes, {
      contentType: captured.mime,
      upsert: true,
      cacheControl: "3600",
    });
  if (upErr) {
    return {
      ok: false,
      reason: "fetch_failed",
      error: `Storage upload failed: ${upErr.message}`,
      sourceUrl,
    };
  }

  await svc
    .from("regulatory_items")
    .update({
      original_storage_path: path,
      original_mime: captured.mime,
      original_size_bytes: captured.bytes.byteLength,
      original_captured_at: new Date().toISOString(),
      original_capture_error: null,
    })
    .eq("id", parsed.data.regId);

  const signed = await sign(svc, path);
  return {
    ok: true,
    signedUrl: signed ?? undefined,
    mime: captured.mime,
    sourceUrl,
    captured: true,
    fromCache: false,
  };
}

async function sign(
  svc: ReturnType<typeof createServiceClient>,
  path: string,
): Promise<string | null> {
  const { data, error } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

interface CaptureResult {
  ok: boolean;
  bytes?: Uint8Array;
  mime?: string;
  error?: string;
  reason?: "fetch_failed" | "too_large";
}

async function captureSource(sourceUrl: string): Promise<CaptureResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "vantage-intelle/1.0 (compliance corpus mirror; +https://intelle.io)",
        Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8",
      },
      signal: ac.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, reason: "fetch_failed" };
    }
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const mime = contentType.includes("application/pdf")
      ? "application/pdf"
      : "text/html";
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return {
        ok: false,
        reason: "too_large",
        error: `Source is ${Math.round(buffer.byteLength / 1024 / 1024)} MB (max 50 MB)`,
      };
    }
    return { ok: true, bytes: new Uint8Array(buffer), mime };
  } catch (e) {
    return { ok: false, error: (e as Error).message, reason: "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience server check used by the SSR detail page to decide
 * whether to render the "Original" tab badge as cached / new / etc.
 */
export async function getOriginalCaptureStatus(
  regId: string,
): Promise<{
  hasCached: boolean;
  hasError: boolean;
  mime: string | null;
}> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("regulatory_items")
    .select(
      "original_storage_path, original_mime, original_capture_error, last_changed_at, original_captured_at",
    )
    .eq("id", regId)
    .maybeSingle();
  if (!data) return { hasCached: false, hasError: false, mime: null };

  const cachedFresh =
    !!data.original_storage_path &&
    (!data.last_changed_at ||
      (data.original_captured_at &&
        new Date(data.original_captured_at).getTime() >=
          new Date(data.last_changed_at).getTime()));

  return {
    hasCached: cachedFresh,
    hasError: !!data.original_capture_error,
    mime: (data.original_mime as string | null) ?? null,
  };
}
