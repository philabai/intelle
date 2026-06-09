import type { Demo } from "../runtime";

export const meta = {
  id: "monitor",
  title: "Monitoring Your Feed",
  subtitle: "Today's relevant changes, saved searches and alerts",
  authed: true,
  file: "2-monitor",
};

async function opt(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped ${label}: ${(e as Error).message.split("\n")[0]})`);
  }
}

export async function run(demo: Demo) {
  await demo.goto("/regwatch/feed", "Your Relevance Feed — the whole corpus scored to your footprint");
  await demo.wait(1000);
  await demo.caption("Critical and high-severity matches float to the top", 2000);
  await demo.scroll(350);

  await opt("severity-filter", async () => {
    await demo.click('text=/^High/i', "Filter by severity");
    await demo.wait(900);
  });
  await opt("assigned", async () => {
    await demo.click('text=/Assigned to me/i', "Or see only what's assigned to you");
    await demo.wait(900);
  });

  await demo.goto("/regwatch/recap", "A weekly recap digests the week's changes");
  await demo.wait(1400);

  await demo.goto("/regwatch/saved", "Saved searches — re-run a query any time");
  await demo.wait(1200);
  await opt("run-saved", async () => {
    await demo.click('a:has-text("Run"), button:has-text("Run")', "Click Run to re-execute a saved search");
    await demo.wait(1400);
  });

  await demo.goto("/regwatch/settings/alerts", "Set up alerts so changes come to you");
  await demo.wait(1400);
  await demo.caption("Email and push alerts on the regulations you care about", 2200);
}
