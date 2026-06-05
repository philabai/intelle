#!/usr/bin/env node
/**
 * scripts/regwatch-create-guest-user.mjs
 *
 * One-shot script: creates (or refreshes) the RegWatch test user
 * `hello@intelle.io` with org tier = "team" so the entire paid surface is
 * exercisable without going through Stripe Checkout.
 *
 * Usage:
 *   node --env-file=.env.local scripts/regwatch-create-guest-user.mjs
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Idempotent:
 *   - If the user already exists, the script resets their password to the
 *     printed temp value (so you can re-share it) and re-upgrades their org
 *     to "team" in case it was tampered with.
 *   - If the user does not exist, the auth.users insert fires the regwatch
 *     signup trigger which auto-creates the personal org; this script then
 *     bumps that org's tier to "team".
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const EMAIL = "hello@intelle.io";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with `node --env-file=.env.local scripts/regwatch-create-guest-user.mjs`",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "regwatch" },
});

// Same client but with the auth admin API (auth.* uses the public schema by default).
const authClient = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  // Paginate through users — for our user base size, one page is plenty.
  const { data, error } = await authClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
}

function tempPassword() {
  return `rw-${randomBytes(6).toString("base64url")}-team`;
}

async function main() {
  const password = tempPassword();
  let user = await findUserByEmail(EMAIL);

  if (!user) {
    console.log(`Creating new user ${EMAIL} …`);
    const { data, error } = await authClient.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "intelle.io guest",
        org_name: "intelle.io Demo",
      },
    });
    if (error) throw error;
    user = data.user;
  } else {
    console.log(`User ${EMAIL} already exists — refreshing password and tier …`);
    const { error: pwErr } = await authClient.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (pwErr) throw pwErr;
  }

  if (!user) {
    throw new Error("Failed to resolve user after create/update");
  }

  // Find the org via organization_members (the trigger creates this on signup).
  const { data: memberships, error: memErr } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);
  if (memErr) throw memErr;
  if (!memberships?.length) {
    throw new Error(
      "No organization_members row for the user. Did the regwatch signup trigger run? See migration 20260602_regwatch_initial.sql.",
    );
  }

  // Bump every org they're an owner of to tier=team (typically just one).
  const ownerOrgIds = memberships.filter((m) => m.role === "owner").map((m) => m.organization_id);
  if (ownerOrgIds.length === 0) {
    throw new Error("User has no owner-role membership; can't safely upgrade an org.");
  }
  const { error: upErr } = await supabase
    .from("organizations")
    .update({ tier: "team" })
    .in("id", ownerOrgIds);
  if (upErr) throw upErr;

  // Mark footprint configured if it isn't — gives them a non-empty Feed faster.
  // (No-op if already configured.)
  await supabase
    .from("operations_footprints")
    .update({ is_configured: true })
    .in("organization_id", ownerOrgIds)
    .eq("is_configured", false);

  console.log("");
  console.log("=================================================================");
  console.log(`  Guest user ready:`);
  console.log(`    Email:    ${EMAIL}`);
  console.log(`    Password: ${password}`);
  console.log(`    Org tier: team`);
  console.log(`    Owner of ${ownerOrgIds.length} organization(s):`);
  for (const id of ownerOrgIds) console.log(`      - ${id}`);
  console.log("=================================================================");
  console.log("");
  console.log("Sign in at: https://intelle.io/regwatch/login");
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});
