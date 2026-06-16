import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { createClient } from "@/lib/regwatch/supabase/server";
import { sendBrevoEmail, type SendBrevoEmailResult } from "@/lib/email/brevo";
import { buildDigest, type DigestMatch, type DigestPayload } from "./alerts-digest";
import type { Severity } from "./match";
import { canUseFeature } from "./tier";
import type { Tier } from "./stripe";

/**
 * Alert digest orchestrator. Runs on a cron; can also be invoked manually
 * with ?mode=daily or ?mode=weekly for testing.
 *
 * Flow:
 *   1. Read every user with email frequency = the requested mode.
 *   2. For each user, pull footprint_matches matched in the lookback window
 *      that haven't yet been delivered via email (alert_deliveries idempotency).
 *   3. Apply the critical-only severity gate per the user's prefs.
 *   4. If there are eligible matches, build the digest, send via Brevo,
 *      and write one alert_deliveries row per match for idempotency.
 *   5. Silently skip when there's nothing to send.
 *
 * The pipeline NEVER sends an unsolicited email — frequency defaults to 'off'
 * and a row only exists in alert_preferences if the user explicitly set it
 * through /regwatch/settings/alerts.
 */

export type DigestMode = "daily" | "weekly";

export interface AlertPipelineResult {
  users_considered: number;
  digests_sent: number;
  matches_delivered: number;
  errors: string[];
  duration_ms: number;
}

interface PrefRow {
  user_id: string;
  organization_id: string;
  critical_only: boolean;
}

interface CandidateMatch extends DigestMatch {
  organizationId: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export async function runAlertDigest(
  mode: DigestMode,
): Promise<AlertPipelineResult> {
  const started = Date.now();
  const result: AlertPipelineResult = {
    users_considered: 0,
    digests_sent: 0,
    matches_delivered: 0,
    errors: [],
    duration_ms: 0,
  };

  const supabase = createServiceClient();
  const sinceMs = mode === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(Date.now() - sinceMs).toISOString();

  // 1. Pull every user opted into this digest cadence.
  const { data: prefRows, error: prefError } = await supabase
    .from("alert_preferences")
    .select("user_id, organization_id, critical_only")
    .eq("channel", "email")
    .eq("frequency", mode)
    .is("saved_view_id", null);

  if (prefError) {
    result.errors.push(`pref query: ${prefError.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  let prefs = (prefRows ?? []) as PrefRow[];

  // 1a. Tier gate — email digests are Pro+. Drop prefs whose org is on Free.
  if (prefs.length > 0) {
    const orgIds = Array.from(new Set(prefs.map((p) => p.organization_id)));
    const { data: orgTierRows } = await supabase
      .from("organizations")
      .select("id, tier")
      .in("id", orgIds);
    const tierByOrgId = new Map<string, Tier>(
      (orgTierRows ?? []).map((o) => [
        o.id as string,
        (o.tier as Tier) ?? "free",
      ]),
    );
    prefs = prefs.filter((p) =>
      canUseFeature(tierByOrgId.get(p.organization_id) ?? "free", "email_digests"),
    );
  }

  result.users_considered = prefs.length;
  if (prefs.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }

  // 2. Fetch the auth.users email for every opted-in user in one round-trip.
  // The auth admin API is only callable with service-role and isn't paginated
  // here; for the v1 user base it's fine.
  const emailByUserId = new Map<string, { email: string; name: string | null }>();
  const orgNameByOrgId = new Map<string, string>();
  for (const p of prefs) {
    if (emailByUserId.has(p.user_id)) continue;
    const { data: userResp, error: userErr } =
      await supabase.auth.admin.getUserById(p.user_id);
    if (userErr || !userResp.user || !userResp.user.email) continue;
    emailByUserId.set(p.user_id, {
      email: userResp.user.email,
      name:
        (userResp.user.user_metadata?.full_name as string | undefined) ?? null,
    });
  }

  const orgIds = Array.from(new Set(prefs.map((p) => p.organization_id)));
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    for (const o of orgs ?? []) {
      orgNameByOrgId.set(o.id as string, o.name as string);
    }
  }

  // 3. For each user, pull eligible matches + filter against alert_deliveries.
  for (const pref of prefs) {
    const recipient = emailByUserId.get(pref.user_id);
    if (!recipient) {
      result.errors.push(`no auth.users record for ${pref.user_id}`);
      continue;
    }

    const { data: matchRows, error: matchError } = await supabase
      .from("footprint_matches")
      .select(
        `id, score, severity, matched_at, organization_id,
         item:regulatory_items!inner (
           citation, title, slug, summary, jurisdiction_code,
           regulator:regulators!inner ( name, short_name )
         )`,
      )
      .eq("organization_id", pref.organization_id)
      .gte("matched_at", sinceIso)
      .is("resolved_at", null);

    if (matchError) {
      result.errors.push(`match query for ${pref.user_id}: ${matchError.message}`);
      continue;
    }

    let candidates: CandidateMatch[] = (matchRows ?? []).map((row) => {
      const item = Array.isArray(row.item) ? row.item[0] : row.item;
      const reg = Array.isArray(item.regulator) ? item.regulator[0] : item.regulator;
      return {
        matchId: row.id as string,
        score: row.score as number,
        severity: row.severity as Severity,
        jurisdictionCode: item.jurisdiction_code as string,
        citation: item.citation as string,
        title: item.title as string,
        slug: item.slug as string,
        summary: (item.summary as string) ?? null,
        regulatorName: reg.name as string,
        regulatorShortName: (reg.short_name as string) ?? null,
        matchedAt: row.matched_at as string,
        organizationId: row.organization_id as string,
      };
    });

    if (pref.critical_only) {
      candidates = candidates.filter((c) => c.severity === "critical");
    }
    if (candidates.length === 0) continue;

    // 4. Idempotency — skip items we've already emailed to this user.
    // alert_deliveries is keyed by regulatory_item_id, but candidates carry
    // match_ids (footprint_matches.id), which the matcher re-stamps on every
    // run — so we must resolve match_id -> regulatory_item_id FIRST, then dedup
    // the delivery log against those item ids. The previous code filtered
    // alert_deliveries.regulatory_item_id against match_ids, which never
    // matched, so every digest re-sent the same item daily.
    const { data: matchToItem } = await supabase
      .from("footprint_matches")
      .select("id, regulatory_item_id")
      .in(
        "id",
        candidates.map((c) => c.matchId),
      );
    const itemIdByMatchId = new Map<string, string>(
      (matchToItem ?? []).map((r) => [
        r.id as string,
        r.regulatory_item_id as string,
      ]),
    );
    const candidateItemIds = Array.from(
      new Set(
        candidates
          .map((c) => itemIdByMatchId.get(c.matchId))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const { data: priorDeliveries } = candidateItemIds.length
      ? await supabase
          .from("alert_deliveries")
          .select("regulatory_item_id")
          .eq("user_id", pref.user_id)
          .eq("channel", "email")
          .in("regulatory_item_id", candidateItemIds)
      : { data: [] as { regulatory_item_id: string }[] };

    const deliveredItemIds = new Set<string>(
      (priorDeliveries ?? []).map((d) => d.regulatory_item_id as string),
    );
    candidates = candidates.filter((c) => {
      const itemId = itemIdByMatchId.get(c.matchId);
      if (!itemId) return false;
      return !deliveredItemIds.has(itemId);
    });
    if (candidates.length === 0) continue;

    // Cap per-digest at 25 items so the email stays scannable. Critical
    // overflow is intentional — Phase 1.7 alerts will fire immediately
    // outside this batched flow.
    candidates = candidates
      .sort(
        (a, b) =>
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          b.score - a.score,
      )
      .slice(0, 25);

    // 5. Build + send.
    const digest = buildDigest({
      matches: candidates,
      window: mode,
      recipientName: recipient.name,
      baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io",
      orgName: orgNameByOrgId.get(pref.organization_id) ?? null,
    });
    if (!digest) continue;

    const sendResult = await sendBrevoEmail({
      to: [{ email: recipient.email, name: recipient.name ?? undefined }],
      subject: digest.subject,
      htmlContent: digest.htmlContent,
    });

    if (!sendResult.ok) {
      const reason =
        sendResult.reason === "http-error"
          ? `Brevo ${sendResult.status}: ${sendResult.body.slice(0, 200)}`
          : sendResult.reason;
      result.errors.push(`send to ${recipient.email}: ${reason}`);
      continue;
    }

    // Write delivery rows for idempotency.
    const deliveryRows = candidates
      .map((c) => itemIdByMatchId.get(c.matchId))
      .filter((id): id is string => Boolean(id))
      .map((regulatoryItemId) => ({
        organization_id: pref.organization_id,
        user_id: pref.user_id,
        regulatory_item_id: regulatoryItemId,
        channel: "email",
        delivery_status: "sent",
        delivery_metadata: { mode, subject: digest.subject },
      }));

    if (deliveryRows.length > 0) {
      // Idempotent write: a unique (user_id, regulatory_item_id, channel)
      // constraint guards re-delivery, so a re-send attempt must no-op rather
      // than fail the whole batch insert.
      const { error: insErr } = await supabase
        .from("alert_deliveries")
        .upsert(deliveryRows, {
          onConflict: "user_id,regulatory_item_id,channel",
          ignoreDuplicates: true,
        });
      if (insErr) {
        result.errors.push(`delivery insert for ${recipient.email}: ${insErr.message}`);
      }
    }

    result.digests_sent += 1;
    result.matches_delivered += candidates.length;
  }

  result.duration_ms = Date.now() - started;
  return result;
}

// ============================================================================
// Single-user helpers — used by the alerts page Preview + Send-test buttons
// so users can validate end-to-end without waiting for the scheduled cron.
// ============================================================================

interface SingleUserPullResult {
  digest: DigestPayload | null;
  matchCount: number;
  /** Item ids included in the digest; used by the test-send to write deliveries. */
  itemIds: string[];
  diagnostics: {
    pulled: number;
    afterCriticalGate: number;
    afterDedup: number;
    capped: number;
  };
}

interface SingleUserPullOptions {
  mode: DigestMode;
  /** When true, applies user's critical_only pref (or critical=true default). */
  applyCriticalOnly?: boolean;
  /** When true, drops items the user has already received via email. */
  dedupAgainstDeliveries: boolean;
}

/**
 * Pulls the digest payload for the SSR-authed user. Used by both the Preview
 * (no send) and the Send-test buttons. Bypasses RLS via the service-role
 * client AFTER the SSR client has confirmed which user is calling.
 */
async function pullDigestForCurrentUser(
  options: SingleUserPullOptions,
): Promise<SingleUserPullResult> {
  const diagnostics = {
    pulled: 0,
    afterCriticalGate: 0,
    afterDedup: 0,
    capped: 0,
  };
  const empty: SingleUserPullResult = {
    digest: null,
    matchCount: 0,
    itemIds: [],
    diagnostics,
  };

  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return empty;

  // Find the user's org via RLS (one row visible).
  const { data: membership } = await ssr
    .from("organization_members")
    .select("organization_id")
    .limit(1)
    .maybeSingle();
  if (!membership) return empty;
  const organizationId = membership.organization_id as string;

  // Read pref so the critical-only gate respects the user's choice. Missing
  // row = default (critical_only=true) which matches the form default.
  let criticalOnly = true;
  if (options.applyCriticalOnly !== false) {
    const { data: pref } = await ssr
      .from("alert_preferences")
      .select("critical_only")
      .eq("channel", "email")
      .is("saved_view_id", null)
      .maybeSingle();
    if (pref) criticalOnly = Boolean(pref.critical_only);
  } else {
    criticalOnly = false;
  }

  const sinceMs =
    options.mode === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(Date.now() - sinceMs).toISOString();

  const svc = createServiceClient();

  const { data: matchRows } = await svc
    .from("footprint_matches")
    .select(
      `id, regulatory_item_id, score, severity, matched_at, organization_id,
       item:regulatory_items!inner (
         citation, title, slug, summary, jurisdiction_code,
         regulator:regulators!inner ( name, short_name )
       )`,
    )
    .eq("organization_id", organizationId)
    .gte("matched_at", sinceIso)
    .is("resolved_at", null);

  diagnostics.pulled = matchRows?.length ?? 0;

  let candidates = (matchRows ?? []).map((row) => {
    const item = Array.isArray(row.item) ? row.item[0] : row.item;
    const reg = Array.isArray(item.regulator)
      ? item.regulator[0]
      : item.regulator;
    return {
      matchId: row.id as string,
      regulatoryItemId: row.regulatory_item_id as string,
      score: row.score as number,
      severity: row.severity as Severity,
      jurisdictionCode: item.jurisdiction_code as string,
      citation: item.citation as string,
      title: item.title as string,
      slug: item.slug as string,
      summary: (item.summary as string) ?? null,
      regulatorName: reg.name as string,
      regulatorShortName: (reg.short_name as string) ?? null,
      matchedAt: row.matched_at as string,
    };
  });

  if (criticalOnly) {
    candidates = candidates.filter((c) => c.severity === "critical");
  }
  diagnostics.afterCriticalGate = candidates.length;

  if (options.dedupAgainstDeliveries) {
    const { data: priorDeliveries } = await svc
      .from("alert_deliveries")
      .select("regulatory_item_id")
      .eq("user_id", user.id)
      .eq("channel", "email");
    const deliveredItemIds = new Set<string>(
      (priorDeliveries ?? []).map((d) => d.regulatory_item_id as string),
    );
    candidates = candidates.filter((c) => !deliveredItemIds.has(c.regulatoryItemId));
  }
  diagnostics.afterDedup = candidates.length;

  candidates = candidates
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.score - a.score,
    )
    .slice(0, 25);
  diagnostics.capped = candidates.length;

  if (candidates.length === 0) {
    return { digest: null, matchCount: 0, itemIds: [], diagnostics };
  }

  // Look up org name for the subject line.
  const { data: org } = await svc
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  const recipientName =
    (user.user_metadata?.full_name as string | undefined) ?? null;

  const digestMatches: DigestMatch[] = candidates.map((c) => ({
    matchId: c.matchId,
    score: c.score,
    severity: c.severity,
    jurisdictionCode: c.jurisdictionCode,
    citation: c.citation,
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    regulatorName: c.regulatorName,
    regulatorShortName: c.regulatorShortName,
    matchedAt: c.matchedAt,
  }));

  const digest = buildDigest({
    matches: digestMatches,
    window: options.mode,
    recipientName,
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io",
    orgName: (org?.name as string) ?? null,
  });

  return {
    digest,
    matchCount: candidates.length,
    itemIds: candidates.map((c) => c.regulatoryItemId),
    diagnostics,
  };
}

export interface PreviewDigestResult {
  ok: boolean;
  error?: string;
  /** Rendered HTML for the digest. Null when nothing eligible. */
  html?: string | null;
  /** Inline subject the email would use. */
  subject?: string;
  matchCount: number;
  diagnostics: SingleUserPullResult["diagnostics"];
}

/**
 * Build the digest HTML for the calling user WITHOUT sending or writing
 * deliveries. Uses no dedup and ignores the critical-only gate so the
 * preview always shows something if any matches exist in the window.
 */
export async function previewMyDigest(
  mode: DigestMode = "daily",
): Promise<PreviewDigestResult> {
  try {
    const ssrPreview = await createClient();
    const { data: membershipTier } = await ssrPreview
      .from("organization_members")
      .select("organization:organizations!inner(tier)")
      .limit(1)
      .maybeSingle();
    const tier: Tier = membershipTier
      ? (Array.isArray(membershipTier.organization)
          ? (membershipTier.organization[0]?.tier as Tier | undefined)
          : ((membershipTier.organization as { tier?: Tier } | null)?.tier)) ??
        "free"
      : "free";
    if (!canUseFeature(tier, "email_digests")) {
      return {
        ok: false,
        error:
          "Email digests require the Pro plan. Upgrade at /regwatch/settings/billing.",
        matchCount: 0,
        diagnostics: { pulled: 0, afterCriticalGate: 0, afterDedup: 0, capped: 0 },
      };
    }

    const pulled = await pullDigestForCurrentUser({
      mode,
      applyCriticalOnly: false,
      dedupAgainstDeliveries: false,
    });
    return {
      ok: true,
      html: pulled.digest?.htmlContent ?? null,
      subject: pulled.digest?.subject,
      matchCount: pulled.matchCount,
      diagnostics: pulled.diagnostics,
    };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message,
      matchCount: 0,
      diagnostics: { pulled: 0, afterCriticalGate: 0, afterDedup: 0, capped: 0 },
    };
  }
}

export interface SendTestDigestResult {
  ok: boolean;
  error?: string;
  sent?: boolean;
  matchCount: number;
  diagnostics: SingleUserPullResult["diagnostics"];
}

/**
 * Real send to the calling user — full flow including dedup and delivery
 * write. The dedup means repeated test sends only deliver new matches;
 * matches already sent stay out (correct behavior for production parity).
 */
export async function sendTestDigestToMe(
  mode: DigestMode = "daily",
): Promise<SendTestDigestResult> {
  try {
    const ssrTier = await createClient();
    const { data: membershipTier } = await ssrTier
      .from("organization_members")
      .select("organization:organizations!inner(tier)")
      .limit(1)
      .maybeSingle();
    const tier: Tier = membershipTier
      ? (Array.isArray(membershipTier.organization)
          ? (membershipTier.organization[0]?.tier as Tier | undefined)
          : ((membershipTier.organization as { tier?: Tier } | null)?.tier)) ??
        "free"
      : "free";
    if (!canUseFeature(tier, "email_digests")) {
      return {
        ok: false,
        error:
          "Email digests require the Pro plan. Upgrade at /regwatch/settings/billing.",
        matchCount: 0,
        diagnostics: { pulled: 0, afterCriticalGate: 0, afterDedup: 0, capped: 0 },
      };
    }

    const pulled = await pullDigestForCurrentUser({
      mode,
      applyCriticalOnly: true,
      dedupAgainstDeliveries: true,
    });
    if (!pulled.digest) {
      return {
        ok: true,
        sent: false,
        matchCount: 0,
        diagnostics: pulled.diagnostics,
      };
    }

    const ssr = await createClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user || !user.email) {
      return {
        ok: false,
        error: "Not authenticated",
        matchCount: 0,
        diagnostics: pulled.diagnostics,
      };
    }

    const sendResult: SendBrevoEmailResult = await sendBrevoEmail({
      to: [{ email: user.email }],
      subject: `[TEST] ${pulled.digest.subject}`,
      htmlContent: pulled.digest.htmlContent,
    });
    if (!sendResult.ok) {
      const reason =
        sendResult.reason === "http-error"
          ? `Brevo ${sendResult.status}: ${sendResult.body.slice(0, 240)}`
          : sendResult.reason === "no-api-key"
            ? "BREVO_API_KEY not set"
            : "Brevo network error";
      return {
        ok: false,
        error: reason,
        matchCount: pulled.matchCount,
        diagnostics: pulled.diagnostics,
      };
    }

    // Write deliveries so the same items don't re-send next time.
    const svc = createServiceClient();
    const { data: org } = await svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (org) {
      await svc.from("alert_deliveries").insert(
        pulled.itemIds.map((regulatoryItemId) => ({
          organization_id: org.organization_id as string,
          user_id: user.id,
          regulatory_item_id: regulatoryItemId,
          channel: "email",
          delivery_status: "sent",
          delivery_metadata: { mode, test: true, subject: pulled.digest!.subject },
        })),
      );
    }

    return {
      ok: true,
      sent: true,
      matchCount: pulled.matchCount,
      diagnostics: pulled.diagnostics,
    };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message,
      matchCount: 0,
      diagnostics: { pulled: 0, afterCriticalGate: 0, afterDedup: 0, capped: 0 },
    };
  }
}
