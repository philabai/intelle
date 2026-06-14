# QA & Security Diagnostic — intelle.io + Vantage (regwatch)

**Engagement:** pre-production QA + security review · multi-tenant, multi-company SaaS for
regulated industries (oil & gas / engineering).
**Status:** INTERIM — static analysis complete; **9 findings (F1–F6, F8, F9, F11) already
fixed** (see §0). Live phases (multi-tenant isolation proof, DAST, load, e2e, billing) are
**pending a dedicated test Supabase project + Stripe test keys** (see §7).

---

## 0. Fixes applied this session (committed locally, not pushed)

| ID | Fix | Commit |
|----|-----|--------|
| F1 | Deny-by-default admin gate; stop defaulting role to "admin" in middleware, `getSessionUser`, login redirect | `3b5819f` |
| F11 | Upgrade `next` 16.2.3 → 16.2.9 (clears the High DoS + most of the 13 advisories) | `d1a3ae3` |
| F4 | HTML-escape all user input in contact + Iris-lead notification emails | `207d5ac` |
| F5 | Server-side upload validation (type allow-list + size caps) for evidence + engagement uploads | `207d5ac` |
| F9 | Bound `/api/chat` payload (per-message + block caps) instead of `z.any()` | `207d5ac` |
| F2 | Require auth on `POST /translate` (was unauthenticated service-role) | `a4c8f7a` |
| F3 | Postgres fixed-window rate limiter on `/contact` (5/min), `/chat` (20/min), `/translate` (30/day) | `a4c8f7a` |
| F6 | Baseline CSP header (frame-ancestors/base-uri/object-src/form-action) | `aed18eb` |
| F8 | Sanitize external-corpus regulation `body_html` with sanitize-html | `27664f8` |

**⚠ Two manual actions required for the fixes to fully take effect:**
1. **Set the platform admin's role** (else F1 locks you out of `/admin`). In the Supabase SQL editor:
   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
   where email = 'arnab@intelle.io';
   ```
2. **Apply the rate-limit migration** to enforce F3 (the limiter fails open until then):
   run `supabase/migrations/20260614_rate_limits.sql` in the SQL editor.

Remaining open (by design): **F7** (verify in live isolation phase), **F10/F12/F16**
(needs-decision), **F13/F14** (test harness / load phase), **F15** (trivial).
**Date:** 2026-06-14 · **Method:** code/architecture review + semgrep (SAST) + gitleaks
(secrets) + npm audit + osv-scanner (deps) + read-only TLS/header probe of production.

---

## 1. Executive summary

The codebase is, on the whole, **well-architected for multi-tenancy**: org isolation is
enforced at the database layer via Supabase RLS (`is_org_member` / `is_org_admin`), secrets
hygiene is good (gitleaks found nothing; no service-role key in client bundles), Stripe
webhooks verify signatures, and customer-doc LLM isolation fails closed. SAST was very clean
(3 warnings, all `dangerouslySetInnerHTML`).

However, several **launch-blocking issues** exist, concentrated in the **public/edge surface**
and **role model**:
- A **privilege-escalation hole**: any authenticated user can reach the intelle **consulting
  back-office** (`/admin`) and another company's customer/engagement data, due to a
  single-user-era `role ?? "admin"` default. *(F1 — High/Critical)*
- **Unauthenticated, un-rate-limited LLM endpoints** that map directly to dollar cost
  (`/translate`, `/chat`, `/contact`, Iris). *(F2, F3 — High)*
- **HTML/email injection** of raw user input into admin notification emails. *(F4 — High)*
- **No server-side file-type/content validation** on uploads. *(F5 — High)*
- Dependency debt (`next@16.2.3` → 13 advisories), **no CSP**, and **zero automated tests/CI**.

**Counts (static phase):** 1 Critical-candidate · 4 High · 8 Medium · 4 Low/Process.
Most High findings are **auto-fixable** in a focused PR.

---

## 2. Findings (static phase — confirmed in code)

Severity = exploitability × blast-radius for a multi-company regulated SaaS. `CVSS≈` is indicative.

| ID | Sev | CVSS≈ | Title | Location | Fix class |
|----|-----|------|-------|----------|-----------|
| **F1** | **Critical** | 8.8 | Any logged-in user reaches `/admin` consulting back-office (cross-tenant data + CMS) via `role ?? "admin"` | `src/lib/supabase/middleware.ts:95,104` | auto-fixable |
| **F2** | **High** | 7.5 | `/regwatch/regulations/[id]/translate` POST unauthenticated + service-role; 5-min throttle is per-id → LLM cost-exhaustion by id enumeration | `src/app/api/regwatch/regulations/[id]/translate/route.ts:108` | auto-fixable |
| **F3** | **High** | 7.5 | No rate limiting on public endpoints (`/api/contact`, `/api/chat`, `/translate`); Iris free-tier cap is the only limiter | `api/contact`, `api/chat`, `api/regwatch/iris` | needs-decision (limiter infra) |
| **F4** | **High** | 7.2 | Raw user input (name/company/message/context) interpolated into notification-email HTML → stored HTML/script injection into admin inbox | `api/contact/route.ts:62-73,82`; `api/chat/route.ts:95-99` | auto-fixable |
| **F5** | **High** | 6.5 | Uploads trust client MIME, no server-side type allow-list / content (AV) scan; engagement upload has no size cap (evidence caps at 200MB) | `api/engagements/[id]/documents/route.ts:78-86`; `lib/regwatch/evidence-actions.ts:171-201` | auto-fixable + needs-decision (AV) |
| **F6** | Med | 5.4 | No Content-Security-Policy header (confirmed in prod response) | `next.config.ts:26-46` | auto-fixable |
| **F7** | Med | 6.1 | `/regwatch/preview` has no app-layer auth — cross-tenant doc/asset safety depends **entirely** on RLS (verify empirically) | `api/regwatch/preview/route.ts` | verify (Phase 2) |
| **F8** | Med | 5.4 | `dangerouslySetInnerHTML` × 3 — regulation-corpus HTML (external/scraped), internal-doc HTML, template; sanitization unverified | `r/[jurisdiction]/[slug]/page.tsx:130`, `documents/editor/DocReadOnlyView.tsx:54`, `gallery/TemplatePreviewPane.tsx:31` | verify + sanitize |
| **F9** | Med | 5.3 | `/api/chat` accepts `content: z.array(z.any())` — client controls full message history (prompt-injection / role-forgery) and unbounded per-message size | `api/chat/route.ts:18-26` | auto-fixable |
| **F10** | Med | 5.0 | Org-purge guarded only by `CRON_SECRET` + UUID echo; non-constant-time compare; no soft-delete / grace window | `api/regwatch/admin/delete-organization/route.ts:17-43` | needs-decision |
| **F11** | Med | 5.9 | Dependency vulns: `next@16.2.3` (13 GHSAs incl. DoS), `postcss`, `qs`, `brace-expansion` (DoS) | `package.json` | auto-fixable (upgrade `next@16.2.9`) |
| **F12** | Med | 5.0 | Multi-org-per-user is unenforced; `getMyOrganization()` `.limit(1)` silently picks one org → wrong-tenant data if a user is ever in 2 orgs | `lib/regwatch/footprint.ts` | needs-decision |
| **F13** | Med | — | No automated tests, no CI — no regression safety net for launch | repo-wide | process |
| **F14** | Med | — | Feed/list queries: 3-join, no pagination, no `score/matched_at` sort index → perf risk at scale (confirm in load phase) | `lib/regwatch/feed-queries.ts` | verify (Phase 5) |
| **F15** | Low | 2.0 | `Server: Vercel` + framework version exposed (info disclosure) | platform | accept/strip |
| **F16** | Low | 3.0 | Audit log is non-blocking + non-exhaustive (some cron/Stripe ops unlogged) — weakens forensic trail for a regulated buyer | `audit_log` writers | needs-decision |

### Detail on the top findings

**F1 — Privilege escalation to the consulting back-office (Critical-candidate).**
`updateSession()` computes `const effective = role ?? "admin"` and admits the request to
`/admin/*` if `ADMIN_ROLES.has(effective)`. Org roles live in `regwatch.organization_members`
(`default 'owner'`), **not** in `auth.users.app_metadata.role`; self-serve regwatch signups
therefore have no `app_metadata.role` → `effective="admin"` → they pass the gate. `/admin/*`
is intelle's **own** consulting back-office: all customers, all engagements + their documents,
all contact submissions, and the AI article CMS (generate/publish). The in-code comment admits
this is a single-user-era shortcut. **Fix:** deny-by-default — require an explicit allow-listed
platform role; never default to admin. (Confirm exposure live in Phase 3.)

**F2/F3 — Unauthenticated, un-metered LLM cost surface.** `POST /translate` performs no auth,
uses the service client, and only de-dupes by `id` for 5 min — an attacker iterates the
public, enumerable `regulatory_items` corpus (~10k rows) to spawn thousands of Claude
translations (`max_tokens 8192`). `/chat` (3 turns × Haiku) and `/contact` (DB insert + 2
emails) are likewise public with no limiter. **Fix:** auth or signed-origin + a global rate
limiter (per-IP/per-user) on every public LLM/email endpoint; cap `/translate` to a daily quota.

**F4 — Email HTML/stored-XSS.** Contact and Iris-lead notification emails build HTML by string
interpolation of user-controlled fields with no escaping (`message` only does `\n→<br>`). A
crafted submission injects markup/links/tracking pixels (and, in some mail clients, script)
into the admin inbox; the submitter confirmation email reflects `data.name`. **Fix:**
HTML-escape every interpolated value (or use a templating layer that escapes by default).

**F5 — Upload validation.** Both upload paths set `contentType: file.type || octet-stream`
(client-controlled) with no server-side extension/MIME allow-list and no content/AV scan;
engagement upload records but never checks `file.size`. Evidence files are then fed to LLM/
ffmpeg analysis. **Fix:** server-side allow-list (PDF/DOCX/images/video as intended), magic-byte
sniff, size caps on both paths, and a malware-scan step (or quarantine bucket) before analysis.

---

## 3. Tool scan results (raw under `tests/reports/`)

- **gitleaks** (full history): **clean** — no committed secrets. ✅
- **semgrep** (`p/owasp-top-ten`,`p/javascript`,`p/react`,`p/secrets`): **3 warnings**, all
  `react-dangerouslysetinnerhtml` (→ F8). No injection/secret hits. ✅ (clean SAST)
- **npm audit**: 5 (1 High = Next.js DoS, 4 Moderate). **osv-scanner**: `next@16.2.3` → **13
  advisories**; `postcss`, `qs@6.11.2`, `brace-expansion@5.0.5` (DoS). → F11. Fix: `next@16.2.9`.
- **Production headers** (`https://intelle.io`): HSTS ✅ (max-age 2y, Vercel-added),
  X-Frame-Options DENY ✅, nosniff ✅, Referrer-Policy ✅, Permissions-Policy ✅ — but **no
  Content-Security-Policy** (→ F6). TLS: valid Let's Encrypt cert, current. `Server: Vercel`
  exposed (→ F15).

---

## 4. What's solid (no action)
Org isolation via RLS on every tenant table; service-role confined to server/cron; no
`NEXT_PUBLIC_*` secret leakage; Stripe webhook signature verification; customer-doc LLM
isolation (`getCustomerLLM` fail-closed); filename sanitization prevents path traversal;
short-TTL (5-min) signed download URLs; security headers (minus CSP).

---

## 5. Prioritized fix backlog (for Claude Code)
**Do first (launch-blockers, mostly auto-fixable):**
1. F1 — remove `role ?? "admin"`; deny-by-default platform-admin gate. *(small, high impact)*
2. F11 — upgrade `next@16.2.9` + transitive bumps; rebuild/smoke. *(small)*
3. F4 — HTML-escape email interpolations (contact + chat). *(small)*
4. F2/F3 — add a rate limiter (e.g. Upstash-style or in-Postgres token bucket) + auth on `/translate`. *(medium)*
5. F5 — server-side upload type/size validation. *(medium; AV scan = needs-decision)*
6. F6 — add CSP header (nonce-based for Next). *(small-medium)*
7. F9 — tighten `/api/chat` schema (typed content blocks + size caps). *(small)*

**Needs your decision:** F3 limiter infra choice · F5 AV/malware scanning · F10 soft-delete
policy · F12 single-org-per-user enforcement vs org-switcher · F16 audit-log completeness.

---

## 5b. Live results — Phase 2: multi-tenant isolation ✅ PASS (39/39)

Test env provisioned (throwaway Supabase, 33 regwatch tables, RLS on all tenant
tables, 1,128 seed items). Seeded 6 fixture users (Org A owner/admin/member,
Org B owner, a multi-org user, a no-org user) and ran an RLS probe that simulates
each user's JWT in-database (`set role authenticated` + `request.jwt.claims`) so
policies evaluate exactly as via PostgREST. Artifacts: `tests/setup/seed-fixtures.sql`,
`tests/isolation/rls-probe.mjs`, `tests/reports/rls-probe.log`.

| Dimension | Result |
|-----------|--------|
| **Read isolation** | Every actor sees own org, **0 cross-tenant rows** across organizations, members, footprints, assets, internal_documents, footprint_matches, audit_log |
| **Positive controls** | Own-org data visible/writable (no false lock-out) |
| **Multi-org user (F12)** | User in Org B + own Org X sees exactly those two, **not** Org A — `.limit(1)` picks one org but RLS still scopes correctly; no cross-leak |
| **No-org user** | Sees nothing anywhere |
| **Write isolation** | A1 INSERT into Org B → **RLS denied**; UPDATE Org B → **0 rows** |
| **Role escalation** | Member A3 cannot self-promote, add members, or edit org settings (all blocked); admin A2 can (positive) |

**→ F7 validated:** RLS is correctly and consistently enforced, so the
RLS-dependent `/preview` endpoint is safe at the data layer. **No tenant-isolation
defects found.** (Remaining isolation check: app-level IDOR via the running app —
deferred to the e2e phase.)

## 5c. Live results — Phase A: app-level authz / IDOR ✅ PASS (7/7)

Ran the app against the test DB (isolated git worktree on :4100) with Playwright
(`playwright.config.ts`, `tests/e2e/authz-idor.spec.ts`):

| Test | Result |
|------|--------|
| Fixture user can log in | ✅ |
| **F1**: regwatch tenant user denied `/admin` back-office | ✅ (fix confirmed at app layer) |
| **IDOR**: A1 cannot read Org B internal doc via `/preview` (404) | ✅ |
| **IDOR**: A1 cannot read Org B asset via `/preview` (404) | ✅ |
| Positive control: A1 CAN read its own Org A doc | ✅ (no false-deny; app functional) |
| **F2**: `/translate` POST → 401 when logged out | ✅ |
| **F2**: `/translate` reachable once authenticated | ✅ |

### F17 (NEW, deployment-config) — `regwatch` schema must be exposed to PostgREST
Provisioning the fresh test project surfaced this: the app's Supabase client uses
`db: { schema: "regwatch" }`, but a new project exposes only `public, graphql_public`.
Result: **every regwatch query silently returns `PGRST106` → the app renders empty
states (e.g. `/browse` shows "No regulations") with no error.** Fix for any new
environment: add `regwatch` to **Settings → API → Exposed schemas** (or
`alter role authenticator set pgrst.db_schemas = 'public, graphql_public, regwatch'; notify pgrst,'reload config';`).
**Severity: Med (ops/runbook)** — not a code bug, but a launch/DR checklist item that
would make a restored or new environment look broken. Add to the deploy runbook.

## 6. Pending — live phases (need the test environment)
Not yet executed; require the dedicated test Supabase + Stripe test mode:
- **Multi-tenant isolation (Phase 2):** empirically prove A1 cannot read/write Org B across
  every table + storage + the `/preview` & `/asset-compliance` IDOR paths; runtime role-escalation;
  signed-URL cross-tenant replay; the F12 two-org case. *(highest-value remaining work)*
- **DAST (Phase 4):** OWASP ZAP authenticated scan (XSS/CSRF/SSRF/open-redirect on `next=`/CORS).
- **Load/stress (Phase 5):** k6 on Feed/Search/Iris + footprint-match pipeline (M×~10k) + cron
  concurrency; confirm F14; capture p95/p99 + breaking points.
- **E2E + a11y (Phases 1/6):** Playwright across en/fr/ar + RTL + mobile; axe-core WCAG.
- **Billing integrity:** Stripe test events → entitlement correctness; server-side paywall.
- **Resilience/regulated-industry:** dependency-down degradation, cron idempotency
  (notify-obligations dup-send), GDPR-erasure zero-residual proof, audit-trail integrity.

---

## 7. To proceed to the live phases — needed from you
1. **A throwaway Supabase project** (URL + anon key + service-role key) — I'll generate a
   consolidated `schema-bundle.sql` from the 66 migrations for you to paste into the SQL editor,
   then seed multi-tenant fixtures (Org A: owner/admin/member; Org B: owner; cross-org + no-org users).
2. **Stripe test-mode keys** + a test webhook secret.
3. Confirm I may run the dev server against `.env.test` and exercise active scans/load there.

Until then I can keep going on: building the Playwright/k6/ZAP harness against a local instance
pointed at the test DB, and the F1–F11 fixes once you approve the backlog order.

---
*Raw evidence: `tests/reports/{semgrep,gitleaks,npm-audit,osv}.json`. This is a diagnostic, not a
formal certification (SOC2/ISO/pentest attestation).*
