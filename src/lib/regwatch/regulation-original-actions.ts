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
// Some publishers (notably SASO) stream PDFs slowly (~6–8 s/MB), so a 20 s cap
// aborted multi-MB originals mid-download even though the URL resolves fine in a
// browser. 45 s covers everything up to ~6 MB; the largest files are served from
// the pre-warmed storage cache (scripts/regwatch-saso-warm-cache.ts), so this
// live fetch only runs on first capture or after a source change.
const FETCH_TIMEOUT_MS = 45_000;
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

  // 1a. Load the regulation row with the minimum columns guaranteed
  //     by 20260602. We attempt to load the original-capture columns
  //     in a second query — if they don't exist yet (20260702 not
  //     applied), we skip caching and fall back to fetching the
  //     source URL straight from the publisher.
  const { data: row, error: loadErr } = await svc
    .from("regulatory_items")
    .select("id, source_url, last_changed_at, regulator_id")
    .eq("id", parsed.data.regId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, error: loadErr?.message ?? "Regulation not found" };
  }

  // 1b. Best-effort load of the original-capture state.
  let cachedPath: string | null = null;
  let cachedMime: string | null = null;
  let cachedCapturedAt: string | null = null;
  let captureColumnsExist = true;
  try {
    const { data: capRow, error: capErr } = await svc
      .from("regulatory_items")
      .select(
        "original_storage_path, original_mime, original_captured_at",
      )
      .eq("id", parsed.data.regId)
      .maybeSingle();
    if (capErr) {
      captureColumnsExist = false;
    } else if (capRow) {
      cachedPath =
        (capRow as { original_storage_path: string | null })
          .original_storage_path ?? null;
      cachedMime =
        (capRow as { original_mime: string | null }).original_mime ?? null;
      cachedCapturedAt =
        (capRow as { original_captured_at: string | null })
          .original_captured_at ?? null;
    }
  } catch {
    captureColumnsExist = false;
  }

  // 2. Best-effort disallow-flag lookup. If the column doesn't exist
  //    yet, treat as allowed (default behaviour). If it does exist and
  //    is true, refuse.
  let disallow = false;
  try {
    const { data: regRow, error: regErr } = await svc
      .from("regulators")
      .select("disallow_original_capture")
      .eq("id", row.regulator_id as string)
      .maybeSingle();
    if (!regErr && regRow) {
      disallow =
        (regRow as { disallow_original_capture: boolean | null })
          .disallow_original_capture === true;
    }
  } catch {
    // Column doesn't exist yet — assume allowed.
  }

  if (disallow) {
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
        mime: cachedMime ?? undefined,
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
    if (captureColumnsExist) {
      await svc
        .from("regulatory_items")
        .update({
          original_capture_error: captured.error,
          original_captured_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.regId);
    }
    return {
      ok: true,
      reason: captured.reason ?? "fetch_failed",
      error: captured.error,
      sourceUrl,
      captured: false,
    };
  }

  // If the capture-columns aren't installed yet (20260702 not applied),
  // we can't persist the cache. Return the source URL directly so the
  // viewer can at least render it via the iframe / external link path,
  // and the translation action can re-fetch + extract on the fly.
  if (!captureColumnsExist) {
    return {
      ok: true,
      signedUrl: sourceUrl,
      mime: captured.mime,
      sourceUrl,
      captured: false,
      fromCache: false,
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
    // Storage bucket might not exist yet (20260702's regwatch-public
    // bucket creation didn't run). Fall back to direct URL so the
    // viewer + translation still work without the cache.
    return {
      ok: true,
      signedUrl: sourceUrl,
      mime: captured.mime,
      sourceUrl,
      captured: false,
      fromCache: false,
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
