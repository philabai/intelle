import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Team Members" };

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Team members."
        description="Invite teammates, assign roles (CCO / EHS Manager / Legal Counsel / ESG Lead / Gov Affairs / Member) — Sweep role-based-default pattern, not RegEd manager-hierarchy. Roles drive default Feed filters, not separate surfaces. Phase 1."
      />
    </RegwatchAppShell>
  );
}
