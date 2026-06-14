import { getTranslations } from "next-intl/server";
import {
  startCheckoutAndRedirect,
  openPortalAndRedirect,
} from "@/lib/regwatch/billing-actions";
import { TIERS, type Tier, type TierDefinition } from "@/lib/regwatch/stripe";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

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
export async function PricingTable({
  currentTier,
  hasStripeCustomer,
  stripeConfigured,
}: Props) {
  const t = await getTranslations("regwatch.billing");
  const tiers: TierDefinition[] = Object.values(TIERS).sort(
    (a, b) => a.rank - b.rank,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <TierCard
            key={tier.tier}
            def={tier}
            isCurrent={currentTier === tier.tier}
            stripeConfigured={stripeConfigured}
            t={t}
          />
        ))}
      </div>

      {hasStripeCustomer && stripeConfigured && (
        <form action={openPortalAndRedirect}>
          <button
            type="submit"
            className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
          >
            {t("openPortal")}
          </button>
          <p className="mt-2 text-xs text-muted">{t("portalHelp")}</p>
        </form>
      )}

      {!stripeConfigured && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-muted">
          <p className="font-medium text-amber-300">{t("notConfiguredTitle")}</p>
          <p className="mt-1 leading-relaxed">
            {t.rich("notConfiguredBody", {
              secretKey: () => (
                <span className="font-mono text-foreground">STRIPE_SECRET_KEY</span>
              ),
              webhookSecret: () => (
                <span className="font-mono text-foreground">
                  STRIPE_WEBHOOK_SECRET
                </span>
              ),
              priceVars: () => (
                <span className="font-mono text-foreground">STRIPE_PRICE_*</span>
              ),
            })}
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
  t,
}: {
  def: TierDefinition;
  isCurrent: boolean;
  stripeConfigured: boolean;
  t: Translator;
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
            {t("currentBadge")}
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
            <p className="text-[11px] text-muted">{t("freeCurrent")}</p>
          ) : (
            <p className="text-[11px] text-muted">{t("freeDowngrade")}</p>
          )
        ) : isEnterprise ? (
          <a
            href="mailto:hello@intelle.io?subject=Vantage Enterprise"
            className="inline-block w-full rounded-md border border-card-border bg-card-bg px-4 py-2 text-center text-sm text-foreground hover:border-brand-teal"
          >
            {t("talkToSales")}
          </a>
        ) : canCheckout ? (
          <form action={startCheckoutAndRedirect}>
            <input type="hidden" name="tier" value={def.tier} />
            <button
              type="submit"
              className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              {t("upgradeTo", { plan: def.label })}
            </button>
          </form>
        ) : isCurrent ? (
          <p className="text-[11px] text-muted">{t("manageInPortal")}</p>
        ) : (
          <p className="text-[11px] text-muted">
            {def.stripePriceId ? t("unavailable") : t("tierNotConfigured")}
          </p>
        )}
      </div>
    </div>
  );
}
