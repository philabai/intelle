import { TIERS, type Tier } from "./stripe";
import { getMyOrganization } from "./footprint";

/**
 * Feature-gate map. Centralises which tier each feature requires so UI pages
 * and server actions can ask `canUseFeature(currentTier, "footprint")` rather
 * than duplicating the rank comparison everywhere.
 *
 * Tier model (as of 2026-06-05):
 *   Free       browse, search, basic Iris (5/day), bell
 *   Pro        + footprint, Feed, briefings, unlimited Iris, email digests, web push (single user)
 *   Team       + up to 10 members, per-match assignment workflow
 *   Enterprise + SSO, custom connectors
 */
export const FEATURE_REQUIRED_TIER = {
  unlimited_iris: "pro",
  email_digests: "pro",
  web_push: "pro",
  footprint: "pro",
  relevance_feed: "pro",
  impact_briefings: "pro",

  members: "team",
  assignment: "team",
  compliance_obligations: "team",
  internal_documents: "team",

  sso: "enterprise",
  custom_connectors: "enterprise",
  evidence_video_analysis: "enterprise",
} satisfies Record<string, Tier>;

export type GatedFeature = keyof typeof FEATURE_REQUIRED_TIER;

/** Number of Iris queries per UTC day allowed on the Free tier. */
export const FREE_IRIS_DAILY_CAP = 5;

export function tierRank(t: Tier): number {
  return TIERS[t].rank;
}

export function isTierAtLeast(current: Tier, required: Tier): boolean {
  return tierRank(current) >= tierRank(required);
}

export function canUseFeature(current: Tier, feature: GatedFeature): boolean {
  return isTierAtLeast(current, FEATURE_REQUIRED_TIER[feature]);
}

/**
 * Convenience wrapper for pages — pulls the calling user's org tier and tells
 * the caller whether they can use the requested feature. Returns the tier so
 * callers can also render appropriate messaging.
 */
export async function checkFeatureGate(
  feature: GatedFeature,
): Promise<{ allowed: boolean; currentTier: Tier; requiredTier: Tier }> {
  const org = await getMyOrganization();
  const currentTier = ((org?.organization.tier as Tier) ?? "free") as Tier;
  const requiredTier = FEATURE_REQUIRED_TIER[feature];
  return {
    allowed: canUseFeature(currentTier, feature),
    currentTier,
    requiredTier,
  };
}

/**
 * Human-readable explanation of why a feature is gated. Used on the Paywall
 * banner copy.
 */
export const FEATURE_DESCRIPTIONS: Record<GatedFeature, { name: string; why: string }> = {
  unlimited_iris: {
    name: "Unlimited Iris Q&A",
    why: "Free is capped at 5 Iris queries per UTC day to keep the corpus public + accessible.",
  },
  email_digests: {
    name: "Email digests",
    why: "Daily + weekly Brevo digests for items that match your filters.",
  },
  web_push: {
    name: "Web push notifications",
    why: "Browser pushes for critical-severity matches, capped at 3 per 24h.",
  },
  footprint: {
    name: "Footprint configurator",
    why: "Configure the geographies, NAICS activities, substances, and regulators we score against. Drives the Relevance Feed.",
  },
  relevance_feed: {
    name: "Relevance Feed",
    why: "Footprint-scored Feed with severity buckets, deadline strip, mark-resolved + assignment workflow.",
  },
  impact_briefings: {
    name: "Impact briefings",
    why: "Claude Opus 4-section briefings (Headline / Why it matters / Details / What to do now) scored against your footprint.",
  },
  members: {
    name: "Team members",
    why: "Invite teammates, assign roles, share the same footprint.",
  },
  assignment: {
    name: "Match assignment",
    why: "Assign individual Feed items to specific teammates with org-scoped routing.",
  },
  compliance_obligations: {
    name: "Compliance obligations",
    why: "Asset hierarchy + reviewer workflow for assigning regulations (or clauses) to specific assets with admin-locked severity and sign-off.",
  },
  internal_documents: {
    name: "Internal documents",
    why: "Upload SOPs, policies, and permits; link them to external regulations and get notified the moment a linked regulation changes.",
  },
  sso: {
    name: "SSO (SAML / OIDC)",
    why: "Federate sign-in to your IdP.",
  },
  custom_connectors: {
    name: "Custom regulator connectors",
    why: "Bespoke scraping for regulators not in the default catalog.",
  },
  evidence_video_analysis: {
    name: "Video evidence AI analysis",
    why: "Frame-by-frame Claude vision + Whisper transcription analysis of mobile-recorded evidence videos, with timestamped discrepancy callouts.",
  },
};
