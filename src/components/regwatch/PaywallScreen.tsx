import Link from "next/link";
import { TIERS, type Tier } from "@/lib/regwatch/stripe";
import { FEATURE_DESCRIPTIONS, type GatedFeature } from "@/lib/regwatch/tier";

interface Props {
  feature: GatedFeature;
  currentTier: Tier;
  requiredTier: Tier;
  /** Optional extra context — e.g. "You've used 5/5 Iris queries today." */
  extra?: string;
}

/**
 * Friendly, on-brand paywall screen rendered in place of the gated content
 * (vs. a redirect). Tells the user (a) what they're trying to use, (b) why
 * it's gated to a specific tier, (c) how to unlock it, and (d) what the
 * cheapest plan that includes the feature looks like.
 */
export function PaywallScreen({
  feature,
  currentTier,
  requiredTier,
  extra,
}: Props) {
  const def = FEATURE_DESCRIPTIONS[feature];
  const requiredDef = TIERS[requiredTier];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-brand-teal/40 bg-brand-teal/5 p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
          Upgrade to unlock
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {def.name}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{def.why}</p>
        {extra && (
          <p className="mx-auto mt-3 max-w-xl text-xs text-amber-300">{extra}</p>
        )}

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-card-border bg-card-bg p-5 text-left">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {requiredDef.label}
            </h2>
            <p className="font-mono text-lg text-foreground">{requiredDef.priceLabel}</p>
          </div>
          <p className="mt-1 text-xs text-muted">{requiredDef.tagline}</p>
          <ul className="mt-4 space-y-1.5 text-xs">
            {requiredDef.features.slice(0, 5).map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-foreground/80">
                <span aria-hidden className="mt-0.5 text-brand-teal">
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/regwatch/settings/billing"
            className="rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            See all plans → Upgrade
          </Link>
          <Link
            href="/regwatch/browse"
            className="rounded-md border border-card-border bg-card-bg px-5 py-2.5 text-sm text-foreground hover:border-brand-teal"
          >
            Browse the corpus instead
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-muted">
          You&apos;re currently on{" "}
          <span className="font-medium capitalize text-foreground">
            {TIERS[currentTier].label}
          </span>
          . Upgrades take effect within seconds of Stripe webhook confirmation.
        </p>
      </div>
    </div>
  );
}
