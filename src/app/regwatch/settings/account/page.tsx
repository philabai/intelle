import Link from "next/link";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import { roleLabel } from "@/lib/regwatch/reference/roles";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignOutButton } from "./SignOutButton";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [footprint, org] = await Promise.all([
    getMyFootprint(),
    getMyOrganization(),
  ]);
  const functionalRole =
    (user?.user_metadata?.functional_role as string | undefined) ?? null;

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
            Account
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your account</h1>
        </div>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Signed in as
          </h2>
          <p className="mt-2 text-lg text-foreground">{user?.email}</p>
          <p className="mt-1 text-xs text-muted">Role: {roleLabel(functionalRole)}</p>
        </section>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
                Footprint
              </h2>
              <p className="mt-2 text-lg text-foreground">
                {footprint?.is_configured ? "Configured" : "Not yet configured"}
              </p>
              {footprint?.is_configured && (
                <p className="mt-1 text-xs text-muted">
                  {footprint.geographies.length}{" "}
                  {footprint.geographies.length === 1 ? "geography" : "geographies"} ·{" "}
                  {footprint.activities_naics.length} NAICS ·{" "}
                  {footprint.monitored_topics.length} topics ·{" "}
                  {footprint.monitored_regulator_slugs.length} regulators
                </p>
              )}
            </div>
            <Link
              href="/regwatch/settings/footprint"
              className="shrink-0 rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-xs text-brand-teal hover:bg-brand-teal/20"
            >
              {footprint?.is_configured ? "Edit footprint →" : "Configure now →"}
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
                Plan
              </h2>
              <p className="mt-2 text-lg capitalize text-foreground">
                {org?.organization.tier ?? "Free"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Upgrade for unlimited Iris Q&amp;A, email digests, web push, and
                the assignment workflow.
              </p>
            </div>
            <Link
              href="/regwatch/settings/billing"
              className="shrink-0 rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-xs text-brand-teal hover:bg-brand-teal/20"
            >
              Manage billing →
            </Link>
          </div>
        </section>

        <RegwatchSignOutButton />
      </div>
    </RegwatchAppShell>
  );
}
