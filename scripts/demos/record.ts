import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { DEMO, loadEnv } from "./config";
import { Demo } from "./runtime";
import * as regulations from "./flows/regulations";
import * as monitor from "./flows/monitor";
import * as comply from "./flows/comply";
import * as author from "./flows/author";

loadEnv();

interface Flow {
  meta: { id: string; title: string; subtitle: string; authed: boolean; file: string };
  run: (demo: Demo) => Promise<void>;
}

const FLOWS: Record<string, Flow> = {
  regulations: regulations as unknown as Flow,
  monitor: monitor as unknown as Flow,
  comply: comply as unknown as Flow,
  author: author as unknown as Flow,
};

function toMp4(webm: string, mp4: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["-y", "-i", webm, "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4];
    const p = spawn(ffmpegPath as string, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

async function record(flow: Flow) {
  const tmpDir = join(DEMO.outDir, ".webm", flow.meta.id);
  mkdirSync(tmpDir, { recursive: true });
  const browser = await chromium.launch();

  // Authed flows: log in first in a throwaway context, capture the session, and
  // start the *recording* context already authenticated — so the video never
  // shows the login screen / credentials.
  let storageState: Awaited<ReturnType<Awaited<ReturnType<typeof browser.newContext>>["storageState"]>> | undefined;
  if (flow.meta.authed) {
    const authCtx = await browser.newContext({ viewport: DEMO.viewport });
    const authPage = await authCtx.newPage();
    await new Demo(authPage).login();
    storageState = await authCtx.storageState();
    await authCtx.close();
  }

  const context = await browser.newContext({
    viewport: DEMO.viewport,
    recordVideo: { dir: tmpDir, size: DEMO.viewport },
    deviceScaleFactor: 1,
    storageState,
  });
  const page = await context.newPage();
  const video = page.video();
  const demo = new Demo(page);

  try {
    await page.goto(DEMO.baseUrl + "/regwatch/discover", { waitUntil: "domcontentloaded" }).catch(() => {});
    await demo.titleCard(flow.meta.title, flow.meta.subtitle);
    await flow.run(demo);
    await demo.caption("That's the tour — explore the rest at intelle.io", 2200);
  } finally {
    await context.close();
    await browser.close();
  }

  const webm = (await video?.path()) ?? readdirSync(tmpDir).map((f) => join(tmpDir, f))[0];
  const mp4 = join(DEMO.outDir, `${flow.meta.file}.mp4`);
  console.log(`  encoding → ${mp4}`);
  await toMp4(webm, mp4);
  rmSync(tmpDir, { recursive: true, force: true });
  console.log(`  ✓ ${flow.meta.file}.mp4`);
}

async function main() {
  if (!ffmpegPath) throw new Error("ffmpeg-static path not resolved");
  mkdirSync(DEMO.outDir, { recursive: true });
  const want = process.argv.slice(2);
  const ids = want.length ? want : Object.keys(FLOWS);
  for (const id of ids) {
    const flow = FLOWS[id];
    if (!flow) {
      console.log(`skip unknown flow: ${id}`);
      continue;
    }
    console.log(`\n▶ recording: ${flow.meta.id}`);
    await record(flow);
  }
  if (existsSync(join(DEMO.outDir, ".webm"))) rmSync(join(DEMO.outDir, ".webm"), { recursive: true, force: true });
  console.log("\n✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
