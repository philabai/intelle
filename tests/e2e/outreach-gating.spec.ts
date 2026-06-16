import { test, expect, type Page } from "@playwright/test";
const PW = "QA-Test-Pass-2026!";
async function login(page: Page, email: string) {
  await page.goto("/en/regwatch/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 });
}
test("admin user reaches /outreach and sees seeded pillars", async ({ page }) => {
  await login(page, "a1-owner@qa.test");        // role=admin
  await page.goto("/en/outreach");
  await expect(page.locator("h1")).toContainText("Vantage Outreach");
  await expect(page.getByText("Regulatory Update Briefings")).toBeVisible(); // proves outreach schema read works
});
test("non-admin user is denied /outreach", async ({ page }) => {
  await login(page, "a3-member@qa.test");        // no platform role
  await page.goto("/en/outreach");
  expect(page.url()).not.toContain("/outreach");
});
