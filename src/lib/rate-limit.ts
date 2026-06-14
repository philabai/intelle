import { createServiceClient } from "@/lib/supabase/service";

/**
 * Fixed-window rate limiter backed by the `public.check_rate_limit` RPC
 * (migration 20260614_rate_limits.sql). Shared across serverless instances.
 *
 * Fails OPEN: if the RPC is missing (migration not yet applied) or errors, the
 * request is allowed and a warning is logged — so the limiter can be deployed
 * before the migration without breaking traffic. Apply the migration to enforce.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_identifier: identifier,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn(`[rate-limit] RPC error (fail-open) for ${bucket}:`, error.message);
      return { allowed: true };
    }
    return { allowed: data === true };
  } catch (e) {
    console.warn(`[rate-limit] threw (fail-open) for ${bucket}:`, (e as Error).message);
    return { allowed: true };
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 response with a Retry-After hint. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
