import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  listMyOrgMembers,
  getMyMembership,
  listMyPendingInvites,
} from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { MembersTable } from "@/components/regwatch/members/MembersTable";
import { AddMemberForm } from "@/components/regwatch/members/AddMemberForm";
import { PendingInvitesTable } from "@/components/regwatch/members/PendingInvitesTable";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";

export const metadata = { title: "Team Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const t = await getTranslations("regwatch.settings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/settings/members");

  const gate = await checkFeatureGate("members");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="members"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
        />
      </RegwatchAppShell>
    );
  }

  const [members, membership, org, invites] = await Promise.all([
    listMyOrgMembers(),
    getMyMembership(),
    getMyOrganization(),
    listMyPendingInvites(),
  ]);

  const canManage =
    !!membership && (membership.role === "owner" || membership.role === "admin");

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("breadcrumbTeam")}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {org?.organization.name ?? t("yourOrganization")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("teamMembersTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t("membersCount", { count: members.length })}
            {invites.length > 0
              ? ` · ${t("pendingInvitesCount", { count: invites.length })}`
              : ""}
            {t("teamRolesHint")}
          </p>
        </header>

        {canManage && (
          <section className="mb-8 rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
            <header>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("addMember")}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {t("addMemberHint")}
              </p>
            </header>
            <div className="mt-4">
              <AddMemberForm />
            </div>
          </section>
        )}

        <PendingInvitesTable invites={invites} callerCanManage={canManage} />

        <div className="mt-6">
          <MembersTable members={members} callerCanManage={canManage} />
        </div>

        {!canManage && (
          <p className="mt-4 text-xs text-muted">
            {t("viewOnlyNote")}
          </p>
        )}
      </div>
    </RegwatchAppShell>
  );
}
