import { defineConfig, devices } from "@playwright/test";

/**
 * QA e2e config. Targets the test-DB app instance (worktree on :4100).
 * Start that app first:  cd <worktree> && npm run dev -- --port 4100
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "tests/reports/playwright.json" }]],
  timeout: 60_000,
  use: {
    baseURL: process.env.QA_BASE_URL || "http://localhost:4100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
