import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignOutButton } from "./SignOutButton";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        </section>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Plan
          </h2>
          <p className="mt-2 text-lg text-foreground">Free</p>
          <p className="mt-1 text-sm text-muted">
            Stripe Billing wires up in Phase 1 — Pro, Team, and Enterprise tiers will be
            available then.
          </p>
        </section>

        <RegwatchSignOutButton />
      </div>
    </RegwatchAppShell>
  );
}
