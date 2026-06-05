#!/usr/bin/env node
/**
 * scripts/regwatch-add-guest-teammate.mjs
 *
 * Adds a teammate user (default: brmanagers@gmail.com) to the org owned by
 * hello@intelle.io with role = "member" so the assignment workflow can be
 * exercised end-to-end. Idempotent:
 *
 *   - If the teammate already has an account, they're added to the org
 *     (existing membership is left alone).
 *   - If the teammate doesn't have an account yet, one is created with a
 *     fresh temp password (printed at the end). Their personal org auto-
 *     created by the signup trigger stays untouched.
 *   - If they're already a member of the target org, nothing changes.
 *
 * Usage:
 *   node --env-file=.env.local scripts/regwatch-add-guest-teammate.mjs
 *   node --env-file=.env.local scripts/regwatch-add-guest-teammate.mjs teammate@example.com
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const OWNER_EMAIL = "hello@intelle.io";
const TEAMMATE_EMAIL = (process.argv[2] ?? "brmanagers@gmail.com").trim();
const TEAMMATE_ROLE = "member"; // change to "admin" if you want them to manage too

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with `node --env-file=.env.local scripts/regwatch-add-guest-teammate.mjs`",
  );
  process.exit(1);
}

const auth = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const rw = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "regwatch" },
});

async function findUserByEmail(email) {
  const { data, error } = await auth.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
}

function tempPassword() {
  return `rw-${randomBytes(6).toString("base64url")}-mem`;
}

async function main() {
  // 1. Resolve the owner + their org.
  const owner = await findUserByEmail(OWNER_EMAIL);
  if (!owner) {
    throw new Error(
      `Owner ${OWNER_EMAIL} not found. Run scripts/regwatch-create-guest-user.mjs first.`,
    );
  }
  const { data: ownerMemberships, error: ownerMemErr } = await rw
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", owner.id)
    .eq("role", "owner");
  if (ownerMemErr) throw ownerMemErr;
  if (!ownerMemberships?.length) {
    throw new Error(`No owner org found for ${OWNER_EMAIL}`);
  }
  const orgId = ownerMemberships[0].organization_id;

  // 2. Resolve (or create) the teammate.
  let teammate = await findUserByEmail(TEAMMATE_EMAIL);
  let issuedPassword = null;
  if (!teammate) {
    issuedPassword = tempPassword();
    console.log(`Creating new user ${TEAMMATE_EMAIL} …`);
    const { data, error } = await auth.auth.admin.createUser({
      email: TEAMMATE_EMAIL,
      password: issuedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: TEAMMATE_EMAIL.split("@")[0],
      },
    });
    if (error) throw error;
    teammate = data.user;
  } else {
    console.log(`User ${TEAMMATE_EMAIL} already exists — reusing account.`);
  }
  if (!teammate) throw new Error("Failed to resolve teammate user");

  // 3. Already a member of the target org?
  const { data: existing } = await rw
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", orgId)
    .eq("user_id", teammate.id)
    .maybeSingle();

  if (existing) {
    console.log(
      `${TEAMMATE_EMAIL} is already a ${existing.role} of the target org — no change.`,
    );
  } else {
    const { error: insErr } = await rw.from("organization_members").insert({
      organization_id: orgId,
      user_id: teammate.id,
      role: TEAMMATE_ROLE,
    });
    if (insErr) throw insErr;
    console.log(`Added ${TEAMMATE_EMAIL} to org ${orgId} as ${TEAMMATE_ROLE}.`);
  }

  console.log("");
  console.log("=================================================================");
  console.log(`  Teammate ready:`);
  console.log(`    Email:    ${TEAMMATE_EMAIL}`);
  if (issuedPassword) {
    console.log(`    Password: ${issuedPassword}  (new account)`);
  } else {
    console.log(`    Password: (use the existing account's password)`);
  }
  console.log(`    Role:     ${existing?.role ?? TEAMMATE_ROLE}`);
  console.log(`    Org:      ${orgId} (owned by ${OWNER_EMAIL})`);
  console.log("=================================================================");
  console.log("");
  console.log("To test assignment:");
  console.log(`  1. Sign in as ${OWNER_EMAIL} → /regwatch/feed`);
  console.log(`  2. On any Feed row, use the Assignee dropdown → pick ${TEAMMATE_EMAIL}`);
  console.log(`  3. Sign in as ${TEAMMATE_EMAIL} → /regwatch/feed?assigned_to_me=1`);
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});
