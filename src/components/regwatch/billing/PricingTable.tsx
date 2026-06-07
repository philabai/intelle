import {
  startCheckoutAndRedirect,
  openPortalAndRedirect,
} from "@/lib/regwatch/billing-actions";
import { TIERS, type Tier, type TierDefinition } from "@/lib/regwatch/stripe";

interface Props {
  currentTier: Tier;
  hasStripeCustomer: boolean;
  stripeConfigured: boolean;
}

/**
 * Server component that renders the four-tier pricing grid plus an
 * "Open billing portal" button when the org already has a Stripe customer.
 * Each card uses a server-action form so the user is redirected directly
 * to Stripe Checkout (no client JS round-trip).
 */
export function PricingTable({
  currentTier,
  hasStripeCustomer,
  stripeConfigured,
}: Props) {
  const tiers: TierDefinition[] = Object.values(TIERS).sort(
    (a, b) => a.rank - b.rank,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => (
          <TierCard
            key={t.tier}
            def={t}
            isCurrent={currentTier === t.tier}
            stripeConfigured={stripeConfigured}
          />
        ))}
      </div>

      {hasStripeCustomer && stripeConfigured && (
        <form action={openPortalAndRedirect}>
          <button
            type="submit"
            className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
          >
            Open Stripe billing portal →
          </button>
          <p className="mt-2 text-xs text-muted">
            Manage payment method, download invoices, cancel or change plans —
            all in Stripe&apos;s hosted portal.
          </p>
        </form>
      )}

      {!stripeConfigured && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-muted">
          <p className="font-medium text-amber-300">Stripe not configured</p>
          <p className="mt-1 leading-relaxed">
            Add <span className="font-mono text-foreground">STRIPE_SECRET_KEY</span>,{" "}
            <span className="font-mono text-foreground">STRIPE_WEBHOOK_SECRET</span>,
            and the per-tier <span className="font-mono text-foreground">STRIPE_PRICE_*</span>{" "}
            env vars in Vercel before checkout will work. See the README for the
            full setup.
          </p>
        </div>
      )}
    </div>
  );
}

function TierCard({
  def,
  isCurrent,
  stripeConfigured,
}: {
  def: TierDefinition;
  isCurrent: boolean;
  stripeConfigured: boolean;
}) {
  const isFree = def.tier === "free";
  const isEnterprise = def.tier === "enterprise";
  const canCheckout =
    stripeConfigured && !isFree && !isEnterprise && !!def.stripePriceId && !isCurrent;
  return (
    <div
      className={`flex flex-col rounded-xl border p-5 ${
        isCurrent
          ? "border-brand-teal bg-brand-teal/5"
          : "border-card-border bg-card-bg/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {def.label}
        </h3>
        {isCurrent && (
          <span className="rounded-full bg-brand-teal/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-teal">
            Current
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{def.tagline}</p>
      <p className="mt-3 text-xl font-semibold text-foreground">{def.priceLabel}</p>
      <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted">
        {def.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <span aria-hidden className="mt-0.5 text-brand-teal">
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        {isFree ? (
          isCurrent ? (
            <p className="text-[11px] text-muted">You&apos;re on the free tier.</p>
          ) : (
            <p className="text-[11px] text-muted">
              Downgrade via the Stripe portal.
            </p>
          )
        ) : isEnterprise ? (
          <a
            href="mailto:hello@intelle.io?subject=Vantage Enterprise"
            className="inline-block w-full rounded-md border border-card-border bg-card-bg px-4 py-2 text-center text-sm text-foreground hover:border-brand-teal"
          >
            Talk to sales
          </a>
        ) : canCheckout ? (
          <form action={startCheckoutAndRedirect}>
            <input type="hidden" name="tier" value={def.tier} />
            <button
              type="submit"
              className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              Upgrade to {def.label}
            </button>
          </form>
        ) : isCurrent ? (
          <p className="text-[11px] text-muted">
            Use the billing portal to manage.
          </p>
        ) : (
          <p className="text-[11px] text-muted">
            {def.stripePriceId ? "Unavailable right now." : "Tier not configured."}
          </p>
        )}
      </div>
    </div>
  );
}
