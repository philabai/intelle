import Link from "next/link";
import { redirect } from "next/navigation";
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
  const raw = await searchParams;
  const checkoutStatus = pick(raw, "checkout");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/settings/billing");

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
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <Link href="/regwatch/settings/account" className="hover:text-foreground">
            Account
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Billing</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {org?.organization.name ?? "Your organization"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Billing
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Currently on the{" "}
            <span className="font-medium text-foreground">{tier}</span> tier. Upgrade
            to unlock unlimited Iris Q&amp;A, email digests, web push, and the
            assignment workflow.
          </p>
        </header>

        {checkoutStatus === "success" && (
          <div className="mb-6 rounded-lg border border-brand-teal/40 bg-brand-teal/10 p-4 text-sm text-brand-teal">
            Checkout completed. Your subscription is being provisioned — the tier
            will update within a few seconds once Stripe&apos;s webhook fires. Refresh
            this page to see the change.
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-300">
            Checkout cancelled. Nothing was charged.
          </div>
        )}

        {!canManage ? (
          <div className="rounded-xl border border-card-border bg-card-bg/40 p-6">
            <p className="text-sm text-foreground">
              Only owners and admins can change the billing plan.
            </p>
            <p className="mt-2 text-xs text-muted">
              Ask an owner to handle the upgrade. Once it&apos;s in place, your
              account inherits the org&apos;s tier automatically.
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
