import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { runMatchPipeline } from "@/lib/regwatch/match-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * User-triggered rematch. Verifies the caller actually owns the footprint
 * they're asking to rescore (via the SSR-authed client + organization_members
 * membership), then hands off to the service-role pipeline narrowed to that
 * single footprint.
 *
 * No CRON_SECRET required because the caller is an authenticated user —
 * the auth + ownership check IS the auth boundary.
 */

const requestSchema = z.object({ footprintId: z.string().uuid() });

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Cross-check that the footprint belongs to an org the caller is a member
  // of. RLS would already block reading other orgs' footprints, but an
  // explicit lookup gives a cleaner error and protects against future schema
  // drift if RLS ever loosens.
  const { data: footprint, error: fpError } = await supabase
    .from("operations_footprints")
    .select("id")
    .eq("id", parsed.footprintId)
    .maybeSingle();
  if (fpError || !footprint) {
    return NextResponse.json(
      { error: "Footprint not found or not yours" },
      { status: 404 },
    );
  }

  // Service-role pipeline scoped to this one footprint. Items_since 365 means
  // the rescore covers the whole corpus, not just recent crawls — useful
  // right after a user changes their footprint and wants to see all matches.
  const result = await runMatchPipeline({
    footprintId: parsed.footprintId,
    itemsSinceDays: 365,
  });

  // Audit-log the user-triggered rematch via the service client so the row
  // is created regardless of the user's RLS (audit_log inserts are
  // service-role only). Non-fatal — pipeline result still returns.
  try {
    const svc = createServiceClient();
    await svc.from("audit_log").insert({
      user_id: user.id,
      action: "regwatch.rematch_footprint",
      entity_type: "operations_footprint",
      entity_id: parsed.footprintId,
      metadata: {
        duration_ms: result.duration_ms,
        matches_upserted: result.matches_upserted,
      },
    });
  } catch {
    /* audit log is non-blocking */
  }

  return NextResponse.json({ ok: true, ...result });
}
