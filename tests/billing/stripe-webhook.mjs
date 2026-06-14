/**
 * Billing-integrity tests for the Stripe webhook (/api/regwatch/stripe/webhook).
 *
 * Signs real webhook events with STRIPE_WEBHOOK_SECRET (Stripe's
 * generateTestHeaderString) and POSTs them to the running test-DB app, then
 * asserts the organization's tier transitions correctly. Also creates a real
 * test-mode subscription to exercise the checkout path (which retrieves the
 * subscription from Stripe), and verifies signature rejection.
 *
 * Requires the test app running on :4100 and .env.test with Stripe test keys.
 * Run: node tests/billing/stripe-webhook.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import Stripe from "stripe";

for (const line of readFileSync(new URL("../../.env.test", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const { SUPABASE_DB_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_TEAM_MONTHLY } = process.env;
const WEBHOOK = "http://localhost:4100/api/regwatch/stripe/webhook";
const stripe = new Stripe(STRIPE_SECRET_KEY);
const client = new pg.Client({ connectionString: SUPABASE_DB_URL });

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`  ${pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${name}${detail ? "  — " + detail : ""}`);
}
async function tier(orgId) {
  const { rows } = await client.query("select tier, stripe_customer_id from regwatch.organizations where id=$1", [orgId]);
  return rows[0];
}
async function postEvent(eventObj, { badSig = false } = {}) {
  const payload = JSON.stringify(eventObj);
  const sig = badSig
    ? "t=1,v1=deadbeef"
    : stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_SECRET });
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": sig },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}
const subEvent = (type, obj) => ({ id: "evt_test", type, data: { object: obj } });

async function main() {
  await client.connect();
  const { rows } = await client.query(
    "select o.id from regwatch.organizations o where o.name='A1 Owner' limit 1");
  const ORG = rows[0].id;
  console.log(`\nORG_A = ${ORG}\nPRO price = ${STRIPE_PRICE_PRO_MONTHLY}\n`);
  const reset = () => client.query(
    "update regwatch.organizations set tier='free', stripe_customer_id=null, stripe_subscription_id=null where id=$1", [ORG]);

  // 1. Signature rejection.
  await reset();
  const bad = await postEvent(subEvent("customer.subscription.updated", {}), { badSig: true });
  record("invalid signature rejected (400)", bad.status === 400, `status=${bad.status}`);

  // 2. subscription.updated active + PRO price -> 'pro'.
  await reset();
  const up = await postEvent(subEvent("customer.subscription.updated", {
    id: "sub_test", status: "active", customer: "cus_test",
    metadata: { organization_id: ORG },
    items: { data: [{ price: { id: STRIPE_PRICE_PRO_MONTHLY } }] },
  }));
  const t2 = await tier(ORG);
  record("subscription.updated(active, PRO price) -> 'pro'", up.status === 200 && t2.tier === "pro", `status=${up.status}, tier=${t2.tier}`);

  // 2b. subscription.updated active + TEAM price -> 'team' (distinct from pro).
  await reset();
  const upT = await postEvent(subEvent("customer.subscription.updated", {
    id: "sub_test", status: "active", customer: "cus_test",
    metadata: { organization_id: ORG },
    items: { data: [{ price: { id: STRIPE_PRICE_TEAM_MONTHLY } }] },
  }));
  const t2b = await tier(ORG);
  record("subscription.updated(active, TEAM price) -> 'team'", upT.status === 200 && t2b.tier === "team", `status=${upT.status}, tier=${t2b.tier}`);

  // 3. subscription.updated canceled -> downgrade to free.
  const down = await postEvent(subEvent("customer.subscription.updated", {
    id: "sub_test", status: "canceled", customer: "cus_test",
    metadata: { organization_id: ORG },
    items: { data: [{ price: { id: STRIPE_PRICE_PRO_MONTHLY } }] },
  }));
  const t3 = await tier(ORG);
  record("subscription.updated(canceled) -> free", down.status === 200 && t3.tier === "free", `tier=${t3.tier}`);

  // 4. checkout.session.completed with a REAL test subscription (handler retrieves it from Stripe).
  await reset();
  let cus, sub;
  try {
    cus = await stripe.customers.create({ email: "qa-billing@example.com", name: "QA Billing" });
    sub = await stripe.subscriptions.create({
      customer: cus.id,
      items: [{ price: STRIPE_PRICE_PRO_MONTHLY }],
      trial_period_days: 7, // avoids needing a payment method
    });
    const co = await postEvent(subEvent("checkout.session.completed", {
      id: "cs_test", client_reference_id: ORG, customer: cus.id, subscription: sub.id,
    }));
    const t4 = await tier(ORG);
    record("checkout.session.completed (real sub) -> paid + customer stored",
      co.status === 200 && t4.tier !== "free" && t4.stripe_customer_id === cus.id,
      `status=${co.status}, tier=${t4.tier}, cust=${t4.stripe_customer_id === cus.id}`);
  } catch (e) {
    record("checkout.session.completed (real sub)", false, `stripe error: ${e.message}`);
  }

  // 5. subscription.deleted by customer id -> free.
  await client.query("update regwatch.organizations set tier='pro', stripe_customer_id='cus_del_test' where id=$1", [ORG]);
  const del = await postEvent(subEvent("customer.subscription.deleted", { id: "sub_x", customer: "cus_del_test" }));
  const t5 = await tier(ORG);
  record("subscription.deleted -> free", del.status === 200 && t5.tier === "free", `tier=${t5.tier}`);

  // Cleanup Stripe test objects + reset org.
  try { if (sub) await stripe.subscriptions.cancel(sub.id); } catch {}
  try { if (cus) await stripe.customers.del(cus.id); } catch {}
  await reset();

  const fails = results.filter((r) => !r.pass).length;
  console.log(`\n${"=".repeat(56)}\nBILLING WEBHOOK: ${results.length - fails}/${results.length} passed, ${fails} failed`);
  await client.end();
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
