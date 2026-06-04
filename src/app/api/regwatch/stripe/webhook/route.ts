import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/regwatch/stripe";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { tierForPriceId, type Tier } from "@/lib/regwatch/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
// IMPORTANT: do not let Next parse the body — Stripe needs the raw bytes for
// signature verification.
export const preferredRegion = "auto";

/**
 * Stripe webhook handler.
 *
 * Configure once in Stripe Dashboard:
 *   1. Add endpoint: https://intelle.io/api/regwatch/stripe/webhook
 *   2. Subscribe to events:
 *        checkout.session.completed
 *        customer.subscription.updated
 *        customer.subscription.deleted
 *   3. Copy the signing secret into STRIPE_WEBHOOK_SECRET env var
 *
 * Responsibilities:
 *   - On checkout.session.completed: persist stripe_customer_id +
 *     stripe_subscription_id onto the organization, set tier from the
 *     subscription's price id.
 *   - On customer.subscription.updated: re-derive tier and write it (handles
 *     mid-cycle plan changes via the Billing Portal).
 *   - On customer.subscription.deleted: downgrade tier back to 'free'.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId =
          session.client_reference_id ?? session.metadata?.organization_id;
        if (!orgId) {
          console.warn("[stripe-webhook] no organization_id on session", session.id);
          return NextResponse.json({ received: true });
        }
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        let tier: Tier = "pro"; // default if we can't resolve from price
        if (subscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price.id;
          if (priceId) {
            const derived = tierForPriceId(priceId);
            if (derived) tier = derived;
          }
        }

        await svc
          .from("organizations")
          .update({
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            tier,
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId =
          (sub.metadata?.organization_id as string | undefined) ?? null;
        if (!orgId) {
          // Fall back to looking up the customer.
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (!customerId) {
            console.warn("[stripe-webhook] no org_id and no customer on sub update");
            return NextResponse.json({ received: true });
          }
          const { data: orgRow } = await svc
            .from("organizations")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (!orgRow) return NextResponse.json({ received: true });
          await applySubscriptionToOrg(svc, orgRow.id as string, sub);
          break;
        }
        await applySubscriptionToOrg(svc, orgId, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) return NextResponse.json({ received: true });
        await svc
          .from("organizations")
          .update({
            tier: "free",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        // Acknowledge unhandled events so Stripe doesn't retry them.
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] handler threw:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function applySubscriptionToOrg(
  svc: ReturnType<typeof createServiceClient>,
  orgId: string,
  sub: Stripe.Subscription,
) {
  const status = sub.status;
  // Active states keep the customer on a paid tier; everything else downgrades.
  const paidStates = new Set<Stripe.Subscription.Status>([
    "active",
    "trialing",
    "past_due", // give them a grace period before downgrade
  ]);
  if (!paidStates.has(status)) {
    await svc
      .from("organizations")
      .update({ tier: "free", stripe_subscription_id: null })
      .eq("id", orgId);
    return;
  }

  let tier: Tier = "pro";
  const priceId = sub.items.data[0]?.price.id;
  if (priceId) {
    const derived = tierForPriceId(priceId);
    if (derived) tier = derived;
  }
  await svc
    .from("organizations")
    .update({
      tier,
      stripe_subscription_id: sub.id,
    })
    .eq("id", orgId);
}
