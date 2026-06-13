"use server";

import { z } from "zod";
// Plain redirect — these targets are EXTERNAL Stripe URLs, never locale-prefixed.
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyOrganization } from "./footprint";
import { getMyMembership } from "./members";
import { getStripe, isStripeConfigured, TIERS, type Tier } from "./stripe";

/**
 * Stripe Billing server actions. Admin-gated (owners + admins) for both
 * checkout and portal — billing-bearing actions should not be performed by
 * regular members. The actions return a result; the caller (a client form)
 * is responsible for navigating to result.url.
 */

const checkoutSchema = z.object({
  tier: z.enum(["pro", "team", "enterprise"]),
});

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

async function ensureBillingAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false as const, error: "No organization" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false as const, error: "Only owners and admins can manage billing" };
  }
  const org = await getMyOrganization();
  if (!org) return { ok: false as const, error: "Organization not found" };
  return {
    ok: true as const,
    userEmail: user.email ?? null,
    organizationId: org.organization_id,
    organizationName: org.organization.name,
    currentTier: (org.organization.tier as Tier) ?? "free",
  };
}

/**
 * Builds a Stripe Checkout session for the chosen tier. Returns the URL the
 * client should redirect to. The session embeds `organization_id` as
 * client_reference_id so the webhook can match the resulting subscription
 * back to the right org without ambiguity.
 */
export async function createCheckoutSession(
  input: unknown,
): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured on this server." };
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid tier" };

  const auth = await ensureBillingAdmin();
  if (!auth.ok) return auth;

  const tierDef = TIERS[parsed.data.tier];
  if (!tierDef.stripePriceId) {
    return {
      ok: false,
      error: `No Stripe price configured for the ${tierDef.label} tier. Set STRIPE_PRICE_${tierDef.tier.toUpperCase()}_MONTHLY in env vars.`,
    };
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io";

  try {
    // Reuse the existing Stripe customer if we have one, otherwise let
    // Checkout create one. The webhook will persist customer_id on success.
    const svc = createServiceClient();
    const { data: org } = await svc
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", auth.organizationId)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: (org?.stripe_customer_id as string | null) ?? undefined,
      customer_email:
        !org?.stripe_customer_id && auth.userEmail ? auth.userEmail : undefined,
      client_reference_id: auth.organizationId,
      line_items: [{ price: tierDef.stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/regwatch/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/regwatch/settings/billing?checkout=cancelled`,
      metadata: {
        organization_id: auth.organizationId,
        target_tier: tierDef.tier,
      },
      subscription_data: {
        metadata: {
          organization_id: auth.organizationId,
        },
      },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL" };
    }
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Stripe Billing Portal — lets the customer manage their subscription,
 * update payment method, cancel, etc. Server action redirects directly so
 * the user doesn't see an intermediate page.
 */
export async function openBillingPortal(): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured on this server." };
  }
  const auth = await ensureBillingAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const { data: org } = await svc
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", auth.organizationId)
    .maybeSingle();
  if (!org?.stripe_customer_id) {
    return {
      ok: false,
      error: "No Stripe customer for this org yet. Upgrade first.",
    };
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io";
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id as string,
      return_url: `${baseUrl}/regwatch/settings/billing`,
    });
    return { ok: true, url: portal.url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Convenience wrapper used by server-rendered forms — performs the checkout
 * setup and immediately redirects to Stripe. Throws on error so Next's
 * error boundary surfaces the issue.
 */
export async function startCheckoutAndRedirect(formData: FormData) {
  const tier = formData.get("tier");
  const result = await createCheckoutSession({ tier });
  if (!result.ok || !result.url) {
    throw new Error(result.error ?? "Could not start checkout");
  }
  redirect(result.url);
}

export async function openPortalAndRedirect() {
  const result = await openBillingPortal();
  if (!result.ok || !result.url) {
    throw new Error(result.error ?? "Could not open billing portal");
  }
  redirect(result.url);
}
