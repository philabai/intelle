import { getTranslations } from "next-intl/server";
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

export default async function AccountPage() {
  const t = await getTranslations("regwatch.settings");
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
  // Admin role (organization_members.role) → human label + tone.
  const adminRoleLabel: Record<string, string> = {
    owner: t("roleOwner"),
    admin: t("roleAdministrator"),
    member: t("roleMember"),
  };

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("profileEyebrow")}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {fullName
              ? t("greeting", { name: firstName ?? fullName })
              : t("yourProfile")}
          </h1>
        </div>

        <section className="rounded-lg border border-card-border bg-card-bg p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            {t("signedInAs")}
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
                  ? t("adminRoleHint")
                  : t("memberRoleHint")
              }
            >
              {adminRoleLabel[adminRole] ?? t("roleMember")}
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
                {t("plan")}
              </h2>
              <p className="mt-2 text-lg capitalize text-foreground">
                {org?.organization.tier ?? t("freeTier")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("planUpgradeHint")}
              </p>
            </div>
            <Link
              href="/regwatch/settings/billing"
              className="shrink-0 rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-xs text-brand-teal hover:bg-brand-teal/20"
            >
              {t("manageBilling")}
            </Link>
          </div>
        </section>

        <RegwatchSignOutButton />
      </div>
    </RegwatchAppShell>
  );
}
