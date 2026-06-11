import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { DEMO, loadEnv } from "../demos/config";
import { Demo } from "../demos/runtime";

loadEnv();

/**
 * Records CLEAN footage (cursor, no burned-in captions — the tutorial player
 * renders the caption banners + Nova voice) of the new Search and Dashboard
 * surfaces, and logs each scene's elapsed timestamp so the tutorial script can
 * use exact segment in/out times. Output → scripts/tutorials/raw/<id>.mp4.
 *
 *   npx tsx scripts/tutorials/record-new.ts search dashboard
 */

const RAW_DIR = "scripts/tutorials/raw";

function toMp4(webm: string, mp4: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      ffmpegPath as string,
      ["-y", "-i", webm, "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4],
      { stdio: "ignore" },
    );
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}`))));
  });
}

let t0 = 0;
const scenes: { label: string; t: number }[] = [];
function scene(label: string) {
  const t = (Date.now() - t0) / 1000;
  scenes.push({ label, t });
  console.log(`  [scene] ${t.toFixed(1)}s  ${label}`);
}

async function opt(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped ${label}: ${(e as Error).message.split("\n")[0]})`);
  }
}

/* ───────────────────────── Search flow ───────────────────────── */
async function searchFlow(demo: Demo) {
  const page = demo.page;
  await demo.goto("/regwatch/search");
  await demo.wait(700);
  scene("home");
  await demo.wait(3200); // dwell on header + source picker

  // Type a query that hits every source.
  await opt("type", async () => {
    await demo.type('input[type="search"]', "methane emissions");
  });
  scene("query-typed");
  await demo.wait(1500);

  // Source picker — turn on Policies + News.
  await opt("policies", () => demo.click('button:has-text("Policies")'));
  await opt("news", () => demo.click('button:has-text("News")'));
  scene("sources");
  await demo.wait(2200);

  // Advanced filters slide open.
  await opt("advanced", () => demo.click('button:has-text("Advanced search")'));
  scene("advanced");
  await demo.wait(3200);
  await opt("advanced-close", () => demo.click('button:has-text("Advanced search")'));

  // Run the search; wait for the (server-rendered) results to appear.
  await opt("search", async () => {
    await demo.click('button[type="submit"]:has-text("Search")');
    await page.waitForLoadState("networkidle").catch(() => {});
  });
  await page.waitForSelector('[data-testid="search-result"]', { timeout: 20000 }).catch(() => {});
  await demo.wait(1500);
  scene("results");
  await demo.wait(7000); // Iris synthesis streams in

  // Open a result in the preview drawer (server-rendered → reliable).
  await opt("drawer", async () => {
    await demo.click('[data-testid="search-result"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => {});
  });
  scene("drawer");
  await demo.wait(5000);
  await opt("drawer-close", () => page.keyboard.press("Escape"));
  await demo.wait(900);

  // Company Docs source + folder picker. Re-assert the query each time so it
  // never depends on persisted state.
  await opt("companydocs-on", () => demo.click('button:has-text("Company Docs")'));
  scene("companydocs-folders");
  await demo.wait(3200);
  await opt("companydocs-search", async () => {
    await demo.type('input[type="search"]', "methane");
    await demo.click('button[type="submit"]:has-text("Search")');
    await page.waitForLoadState("networkidle").catch(() => {});
  });
  await page.waitForSelector('section:has-text("company documents")', { timeout: 20000 }).catch(() => {});
  await demo.wait(1500);
  await opt("scroll-docs", () =>
    page.locator('section:has-text("company documents")').first().scrollIntoViewIfNeeded(),
  );
  await demo.wait(1200);
  scene("companydocs-results");
  await demo.wait(4800);

  // Assets source.
  await opt("assets-on", () => demo.click('button:has-text("Assets")'));
  await opt("assets-search", async () => {
    await demo.type('input[type="search"]', "turbine");
    await demo.click('button[type="submit"]:has-text("Search")');
    await page.waitForLoadState("networkidle").catch(() => {});
  });
  await page.waitForSelector('section:has-text("in your assets")', { timeout: 20000 }).catch(() => {});
  await demo.wait(1200);
  await opt("scroll-assets", () =>
    page.locator('section:has-text("in your assets")').first().scrollIntoViewIfNeeded(),
  );
  await demo.wait(1200);
  scene("assets-results");
  await demo.wait(4200);
  scene("end");
}

/* ───────────────────────── Dashboard flow ───────────────────────── */
async function dashboardFlow(demo: Demo) {
  await demo.goto("/regwatch/dashboard");
  await demo.wait(1200);
  scene("home");
  await demo.wait(3200); // hero KPIs

  await opt("kpis", () => demo.moveTo('a:has-text("Reviews awaiting you")'));
  scene("kpis");
  await demo.wait(2600);

  await opt("queue", () => demo.moveTo('h3:has-text("My queue")'));
  scene("myqueue");
  await demo.wait(3200);

  await opt("posture", () => demo.moveTo('h3:has-text("Compliance posture")'));
  scene("posture");
  await demo.wait(3400);

  await opt("scroll1", () => demo.scroll(360));
  await opt("obligations", () => demo.moveTo('h3:has-text("Obligations")'));
  scene("cards");
  await demo.wait(3600);

  await opt("assets", () => demo.moveTo('h3:has-text("Assets")'));
  scene("assets-card");
  await demo.wait(3000);

  await opt("docs", () => demo.moveTo('h3:has-text("Company documents")'));
  scene("documents-card");
  await demo.wait(3000);

  await opt("scroll2", () => demo.scroll(420));
  await opt("activity", () => demo.moveTo('h3:has-text("Recent activity")'));
  scene("activity");
  await demo.wait(3600);

  // Click into a critical card.
  await opt("open-inbox", async () => {
    await demo.scroll(-600);
    await demo.click('section:has-text("Reviewer inbox") a:has-text("View")');
    await demo.page.waitForLoadState("networkidle").catch(() => {});
  });
  scene("open-inbox");
  await demo.wait(3500);
  scene("end");
}

async function record(id: string, run: (d: Demo) => Promise<void>) {
  const tmp = join(RAW_DIR, ".webm", id);
  mkdirSync(tmp, { recursive: true });
  const browser = await chromium.launch();

  // Authenticate in a throwaway context, then record already logged-in.
  const authCtx = await browser.newContext({ viewport: DEMO.viewport });
  await new Demo(await authCtx.newPage()).login();
  const storageState = await authCtx.storageState();
  await authCtx.close();

  const context = await browser.newContext({
    viewport: DEMO.viewport,
    recordVideo: { dir: tmp, size: DEMO.viewport },
    deviceScaleFactor: 1,
    storageState,
  });
  const page = await context.newPage();
  const video = page.video();
  const demo = new Demo(page);

  scenes.length = 0;
  t0 = Date.now();
  try {
    await run(demo);
  } finally {
    await context.close();
    await browser.close();
  }

  const webm = (await video?.path()) ?? readdirSync(tmp).map((f) => join(tmp, f))[0];
  const mp4 = join(RAW_DIR, `${id}.mp4`);
  await toMp4(webm, mp4);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  ✓ ${mp4}`);
  console.log(`  SCENES (${id}):`);
  for (const s of scenes) console.log(`    ${s.t.toFixed(1)}s\t${s.label}`);
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  const want = process.argv.slice(2);
  const ids = want.length ? want : ["search", "dashboard"];
  const flows: Record<string, (d: Demo) => Promise<void>> = {
    search: searchFlow,
    dashboard: dashboardFlow,
  };
  for (const id of ids) {
    if (!flows[id]) continue;
    console.log(`\n▶ recording: ${id}`);
    await record(id, flows[id]);
  }
  rmSync(join(RAW_DIR, ".webm"), { recursive: true, force: true });
  console.log("\n✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
