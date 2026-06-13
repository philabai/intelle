import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { getMyMembership } from "@/lib/regwatch/members";
import { roleLabel } from "@/lib/regwatch/reference/roles";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignOutButton } from "./SignOutButton";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

// Admin role (organization_members.role) → human label + tone.
const ADMIN_ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Member",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [org, membership] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
  ]);
  const functionalRole =
    (user?.user_metadata?.functional_role as string | undefined) ?? null;

  const firstName = (user?.user_metadata?.first_name as string | undefined)?.trim();
  const lastName = (user?.user_metadata?.last_name as string | undefined)?.trim();
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (user?.user_metadata?.full_name as string | undefined) ||
    null;

  const adminRole = membership?.role ?? "member";
  const isAdminLike = adminRole === "owner" || adminRole === "admin";

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
            Profile
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {fullName ? `Hi, ${firstName ?? fullName}` : "Your profile"}
          </h1>
        </div>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Signed in as
          </h2>
          {fullName && (
            <p className="mt-2 text-lg text-foreground">{fullName}</p>
          )}
          <p className={fullName ? "mt-0.5 text-sm text-muted" : "mt-2 text-lg text-foreground"}>
            {user?.email}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                isAdminLike
                  ? "bg-brand-blue/15 text-brand-blue"
                  : "bg-card-bg/60 text-muted"
              }`}
              title={
                isAdminLike
                  ? "Admins can create documents, manage members, and assign reviewers."
                  : "Members can review assignments and read the corpus."
              }
            >
              {ADMIN_ROLE_LABEL[adminRole] ?? "Member"}
            </span>
            {functionalRole && (
              <span className="rounded-md bg-card-bg/60 px-2 py-0.5 text-[11px] text-muted">
                {roleLabel(functionalRole)}
              </span>
            )}
          </div>

          <ProfileForm
            initialFirstName={firstName ?? ""}
            initialLastName={lastName ?? ""}
          />
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
