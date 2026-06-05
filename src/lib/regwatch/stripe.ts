import Stripe from "stripe";

/**
 * Stripe primitives for RegWatch billing.
 *
 * One singleton Stripe client. Lazy so missing keys don't crash route
 * imports — callers should consult `isStripeConfigured()` and fall back to
 * a friendly message if false.
 *
 * Env vars (set in Vercel + .env.local):
 *   STRIPE_SECRET_KEY                  — server-only
 *   STRIPE_WEBHOOK_SECRET              — verifies inbound webhook events
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — exposed to client (unused in v1 because
 *                                        the upgrade flow uses Checkout)
 *   STRIPE_PRICE_PRO_MONTHLY           — price id for the Pro monthly tier
 *   STRIPE_PRICE_TEAM_MONTHLY          — optional Team tier
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY    — optional Enterprise tier
 */

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  _client = new Stripe(key, {
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: { name: "intelle.io RegWatch", version: "0.1.0" },
  });
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// ----- Tier model ----------------------------------------------------------

export type Tier = "free" | "pro" | "team" | "enterprise";

export interface TierDefinition {
  tier: Tier;
  label: string;
  /** Tagline shown on the plan card. */
  tagline: string;
  /** Display price (we don't query Stripe for amounts on render — too slow). */
  priceLabel: string;
  /** Set of feature strings rendered as a check-list. */
  features: string[];
  /** Stripe price ID — null for tiers with no checkout (Free, Enterprise=sales-led). */
  stripePriceId: string | null;
  /** Order in which to render in the pricing table. */
  rank: number;
}

export const TIERS: Record<Tier, TierDefinition> = {
  free: {
    tier: "free",
    label: "Free",
    tagline: "Browse the corpus + ask Iris with a daily limit.",
    priceLabel: "$0",
    features: [
      "Global Regulations Browser (full corpus)",
      "Topic + Regulator profiles",
      "Search + Iris Q&A (5 queries/day)",
      "In-app notification bell",
    ],
    stripePriceId: null,
    rank: 1,
  },
  pro: {
    tier: "pro",
    label: "Pro",
    tagline: "Footprint-scored Feed + Iris, for one practitioner.",
    priceLabel: "$99 / month",
    features: [
      "Everything in Free",
      "Footprint configurator",
      "Relevance Feed (footprint-scored)",
      "Unlimited impact briefings",
      "Unlimited Iris Q&A queries",
      "Daily / weekly email digests",
      "Web push for critical matches",
      "Priority email support",
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    rank: 2,
  },
  team: {
    tier: "team",
    label: "Team",
    tagline: "Same footprint + assignment workflow for teams of 2-10.",
    priceLabel: "$249 / month",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Per-match assignment workflow",
      "Shared footprint + briefings across the team",
    ],
    stripePriceId: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
    rank: 3,
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    tagline: "SSO, custom connectors, dedicated support. Sales-led.",
    priceLabel: "Custom",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "SSO (SAML / OIDC)",
      "Custom regulator connectors",
      "Dedicated CSM + 99.9% SLA",
      "Annual contract",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null,
    rank: 4,
  },
};

export function tierForPriceId(priceId: string): Tier | null {
  for (const def of Object.values(TIERS)) {
    if (def.stripePriceId === priceId) return def.tier;
  }
  return null;
}

export function ranksAtLeast(current: Tier, target: Tier): boolean {
  return TIERS[current].rank >= TIERS[target].rank;
}
