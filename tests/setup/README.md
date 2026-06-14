# QA test environment setup

Active QA (isolation, DAST, load, e2e) runs against a **throwaway Supabase test
project** — never production. Steps:

## 1. Apply the schema
In the test project's **SQL editor**, paste and run
[`tests/setup/schema-bundle.sql`](./schema-bundle.sql) (pgvector + public
baseline + 65 regwatch migrations + storage buckets). Report any errors back.

## 2. Expose the `regwatch` schema
The app's Supabase clients use `db: { schema: "regwatch" }`. In the test project:
**Settings → API → Exposed schemas** → add `regwatch` (keep `public`, `storage`).

## 3. Fill in `.env.test`
Already created (gitignored). Add the **service-role / secret key** from
**Settings → API** (`sb_secret_…` or the legacy `service_role` JWT):
```
SUPABASE_SERVICE_ROLE_KEY=<paste here>
```
(URL, anon/publishable key, and a generated CRON_SECRET are already set.)

## 4. Seed fixtures
```
npx tsx --env-file=.env.test tests/fixtures/seed.ts
```
Creates Org A (owner/admin/member), Org B (owner), a cross-org user, a no-org
user, and a platform-admin; writes `tests/fixtures/state.json`.

## 5. Run the isolation probe (Phase 2 — highest value)
```
npx tsx --env-file=.env.test tests/isolation/probe.ts
```
Proves Org A cannot read/write Org B across every tenant table (positive +
negative controls), member cannot escalate, and surfaces the F12 multi-org case.
Writes `tests/reports/isolation.json`.

## Later
- **Stripe test-mode keys** for billing tests.
- App run against `.env.test` for Playwright e2e + ZAP DAST: `npm run dev` with
  the test env, then point the harness at `http://localhost:4000`.
