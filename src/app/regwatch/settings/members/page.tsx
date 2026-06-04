import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { listMyOrgMembers, getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { MembersTable } from "@/components/regwatch/members/MembersTable";
import { AddMemberForm } from "@/components/regwatch/members/AddMemberForm";

export const metadata = { title: "Team Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/settings/members");

  const [members, membership, org] = await Promise.all([
    listMyOrgMembers(),
    getMyMembership(),
    getMyOrganization(),
  ]);

  const canManage =
    !!membership && (membership.role === "owner" || membership.role === "admin");

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Team</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {org?.organization.name ?? "Your organization"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Team members
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {members.length} {members.length === 1 ? "member" : "members"} ·
            Admin roles control who can manage the org and invite others.
            Functional roles (CCO / EHS Manager / Legal Counsel / ESG Lead /
            Gov Affairs) live on each user&apos;s Footprint and drive their
            Feed defaults.
          </p>
        </header>

        {canManage && (
          <section className="mb-8 rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
            <header>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Add a member
              </h2>
              <p className="mt-1 text-xs text-muted">
                The person must already have an intelle.io account. We&apos;ll
                add a Supabase invite-by-email flow in a later slice — for now,
                ask them to sign up at{" "}
                <a
                  href="https://intelle.io/regwatch/signup"
                  className="text-brand-teal hover:underline"
                >
                  /regwatch/signup
                </a>{" "}
                first.
              </p>
            </header>
            <div className="mt-4">
              <AddMemberForm />
            </div>
          </section>
        )}

        <MembersTable members={members} callerCanManage={canManage} />

        {!canManage && (
          <p className="mt-4 text-xs text-muted">
            You can view this team but only owners and admins can change roles
            or remove members. To upgrade your role, ask an owner.
          </p>
        )}
      </div>
    </RegwatchAppShell>
  );
}
