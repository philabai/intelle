import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client scoped to the `outreach` schema. Bypasses RLS —
 * use in crons + server actions (after an app-layer admin check). */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "outreach" },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
