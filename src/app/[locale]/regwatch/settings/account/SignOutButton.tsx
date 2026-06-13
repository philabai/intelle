"use client";

import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/regwatch/supabase/client";

export function RegwatchSignOutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/regwatch");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="self-start rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-red-400 hover:text-red-300"
    >
      Sign out
    </button>
  );
}
