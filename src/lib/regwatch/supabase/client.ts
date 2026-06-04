import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client scoped to the `regwatch` schema.
 *
 * Distinct from the main app's `@/lib/supabase/client` (which targets `public`)
 * so RegWatch reads/writes its own tables without cross-schema spillover.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "regwatch" } },
  );
}
