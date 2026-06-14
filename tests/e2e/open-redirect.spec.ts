import { test, expect } from "@playwright/test";

/** Open-redirect probe on the post-login `next` param (regwatch login). */
test("open-redirect: external next is not honoured after login", async ({ page }) => {
  await page.goto("/en/regwatch/login?next=https://example.com/evil");
  await page.locator('input[type="email"]').fill("a1-owner@qa.test");
  await page.locator('input[type="password"]').fill("QA-Test-Pass-2026!");
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  const url = page.url();
  console.log("POST-LOGIN URL:", url);
  // Must stay on our origin — never navigate to example.com.
  expect(url).not.toContain("example.com");
  expect(new URL(url).host).toBe(new URL(page.context().pages()[0].url()).host);
});
