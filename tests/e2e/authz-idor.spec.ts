import { test, expect, type Page } from "@playwright/test";

/**
 * App-level authorization + IDOR tests against the running test-DB app.
 * Verifies the F1/F2 fixes and cross-tenant isolation through the real app
 * (RLS via the authenticated SSR client), complementing the DB-level RLS probe.
 *
 * Fixture IDs are passed via env (see run command). Password is the seed default.
 */
const PW = "QA-Test-Pass-2026!";
const ORGA_DOC = process.env.ORGA_DOC!;
const ORGB_DOC = process.env.ORGB_DOC!;
const ORGB_ASSET = process.env.ORGB_ASSET!;
const PUB_REG = process.env.PUB_REG!;

async function login(page: Page, email: string) {
  await page.goto("/en/regwatch/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.locator('button[type="submit"]').click();
  // Login redirects away from /login on success.
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
}

test.describe("Auth + multi-tenant isolation (app level)", () => {
  test("fixture user can log in and reach the app", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    expect(page.url()).not.toContain("/login");
  });

  test("F1: regwatch tenant user is denied the /admin back-office", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    await page.goto("/en/admin");
    // middleware + getSessionUser deny-by-default => redirected away from /admin.
    expect(page.url()).not.toContain("/admin");
  });

  test("IDOR: A1 cannot read Org B internal document via /preview", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    const res = await page.request.get(`/api/regwatch/preview?kind=doc&id=${ORGB_DOC}`);
    const body = await res.text();
    expect(res.status(), "cross-tenant doc should be 404/empty").toBe(404);
    expect(body).not.toContain("ORG-B Confidential SOP");
  });

  test("IDOR: A1 cannot read Org B asset via /preview", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    const res = await page.request.get(`/api/regwatch/preview?kind=asset&id=${ORGB_ASSET}`);
    expect(res.status()).toBe(404);
  });

  test("Positive control: A1 CAN read its own Org A document", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    const res = await page.request.get(`/api/regwatch/preview?kind=doc&id=${ORGA_DOC}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("ORG-A Confidential SOP");
  });

  test("F2: /translate POST requires auth (401 when logged out)", async ({ request }) => {
    const res = await request.post(`/api/regwatch/regulations/${PUB_REG}/translate`);
    expect(res.status()).toBe(401);
  });

  test("F2: /translate POST is reachable once authenticated (not 401)", async ({ page }) => {
    await login(page, "a1-owner@qa.test");
    const res = await page.request.post(`/api/regwatch/regulations/${PUB_REG}/translate`);
    expect(res.status()).not.toBe(401);
  });
});
