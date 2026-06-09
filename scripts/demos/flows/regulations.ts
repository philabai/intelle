import type { Demo } from "../runtime";

export const meta = {
  id: "regulations",
  title: "Exploring Regulations",
  subtitle: "Browse, search and navigate the regulatory corpus",
  authed: false,
  file: "1-regulations",
};

async function opt(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped ${label}: ${(e as Error).message.split("\n")[0]})`);
  }
}

export async function run(demo: Demo) {
  await demo.goto("/regwatch/discover", "Discover — every regulation, organised by country");
  await demo.wait(800);

  await opt("open-jurisdiction", async () => {
    await demo.click('a[href="/regwatch/browse/us"]', "Open a jurisdiction — United States");
  });

  await demo.caption("Browse the full CFR hierarchy — Title → Chapter → Part → Section", 1800);
  await opt("expand-tree", async () => {
    await demo.click('button[aria-label="Expand"]', "Click any node to expand it");
  });
  await opt("expand-tree-2", async () => {
    await demo.click('button[aria-label="Expand"] >> nth=1', "Drill down through the structure");
  });

  await opt("list-view", async () => {
    await demo.click('a[href*="view=list"]', "Or switch to a flat, filterable list");
    await demo.wait(900);
  });

  await demo.goto("/regwatch/search", "Search — keyword + Iris natural-language Q&A");
  await opt("search", async () => {
    await demo.type('input[type="search"], input[name="q"], input[placeholder*="Search" i], input[placeholder*="Ask" i]', "methane emissions reporting", "Ask a question in plain English");
    await demo.page.keyboard.press("Enter");
    await demo.page.waitForLoadState("networkidle").catch(() => {});
    await demo.wait(2200);
    await demo.caption("Iris answers with citations into the corpus", 2000);
    await demo.scroll(400);
  });

  await demo.goto("/regwatch/topics", "Or browse by topic");
  await opt("topic", async () => {
    await demo.click('a[href="/regwatch/topic/emissions"]', "Open a topic to see every matching regulation");
    await demo.wait(1200);
    await demo.scroll(300);
  });

  await demo.goto("/regwatch/r/us/10-cfr-part-50", "Open any regulation to read the full text");
  await demo.wait(1400);
  await demo.scroll(500);
  await demo.caption("Full text, metadata, topics and related rules — all in one place", 2200);
}
