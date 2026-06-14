import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { isStripeConfigured, type Tier } from "@/lib/regwatch/stripe";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PricingTable } from "@/components/regwatch/billing/PricingTable";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function BillingPage({ searchParams }: Props) {
  const t = await getTranslations("regwatch.settings");
  const raw = await searchParams;
  const checkoutStatus = pick(raw, "checkout");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/settings/billing");

  const [org, membership] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
  ]);

  const tier: Tier = ((org?.organization.tier as Tier) ?? "free") as Tier;
  const canManage =
    !!membership && (membership.role === "owner" || membership.role === "admin");

  // Fetch the stripe_customer_id via service-role (column not exposed via RLS).
  let hasStripeCustomer = false;
  if (org) {
    const svc = createServiceClient();
    const { data } = await svc
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", org.organization_id)
      .maybeSingle();
    hasStripeCustomer = !!(data?.stripe_customer_id as string | null);
  }

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/regwatch/settings/account" className="hover:text-foreground">
            {t("breadcrumbAccount")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("breadcrumbBilling")}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {org?.organization.name ?? t("yourOrganization")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("billingTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t.rich("currentTier", {
              tier,
              strong: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
            })}
          </p>
        </header>

        {checkoutStatus === "success" && (
          <div className="mb-6 rounded-lg border border-brand-teal/40 bg-brand-teal/10 p-4 text-sm text-brand-teal">
            {t("checkoutSuccess")}
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-300">
            {t("checkoutCancelled")}
          </div>
        )}

        {!canManage ? (
          <div className="rounded-xl border border-card-border bg-card-bg/40 p-6">
            <p className="text-sm text-foreground">
              {t("billingOwnersOnly")}
            </p>
            <p className="mt-2 text-xs text-muted">
              {t("billingOwnersOnlyHint")}
            </p>
          </div>
        ) : (
          <PricingTable
            currentTier={tier}
            hasStripeCustomer={hasStripeCustomer}
            stripeConfigured={isStripeConfigured()}
          />
        )}
      </div>
    </RegwatchAppShell>
  );
}
