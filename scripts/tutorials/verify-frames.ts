import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FF = require("ffmpeg-static") as string;
const FONT = "/System/Library/Fonts/Supplemental/Arial.ttf";

/**
 * QA: for a rendered course, lay out a labelled frame at the MIDPOINT of every
 * step (to confirm the screen matches that step's caption/narration) plus each
 * section's TAIL frame (to confirm no capture-toolbar / wrong-screen flowover).
 *
 *   npx tsx scripts/tutorials/verify-frames.ts <course>  →  /tmp/tut-check/<course>-sheet.jpg
 */

interface Cue { start: number; end: number; text: string }
interface Sec { slug: string; file: string; durationSec: number; cues: Cue[] }

function run(args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn(FF, args, { stdio: ["ignore", "ignore", "ignore"] });
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`))));
  });
}
const esc = (s: string) => s.replace(/[':\\]/g, "\\$&").replace(/,/g, "\\,");

async function main() {
  const course = process.argv[2];
  const outDir = `scripts/tutorials/out/${course}`;
  const manifest = JSON.parse(readFileSync(`${outDir}/cues.json`, "utf8")) as { sections: Sec[] };
  const tmp = `/tmp/tut-check/${course}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  let n = 0;
  for (let si = 0; si < manifest.sections.length; si++) {
    const s = manifest.sections[si];
    const clip = `${outDir}/${s.file}`;
    for (let ci = 0; ci < s.cues.length; ci++) {
      const c = s.cues[ci];
      const t = (c.start + c.end) / 2;
      const label = `${si + 1}.${ci + 1}  ${c.text}`;
      n++;
      await run(["-hide_banner", "-y", "-ss", t.toFixed(2), "-i", clip, "-frames:v", "1",
        "-vf", `scale=600:338,drawtext=fontfile=${FONT}:text='${esc(label)}':fontsize=18:fontcolor=white:box=1:boxcolor=0x1e7d4f@0.85:boxborderw=5:x=6:y=6`,
        "-q:v", "3", `${tmp}/f-${String(n).padStart(3, "0")}.jpg`]);
    }
    // tail frame
    const tt = Math.max(0, s.durationSec - 0.25);
    n++;
    await run(["-hide_banner", "-y", "-ss", tt.toFixed(2), "-i", clip, "-frames:v", "1",
      "-vf", `scale=600:338,drawtext=fontfile=${FONT}:text='${esc(`TAIL  ${s.slug}`)}':fontsize=18:fontcolor=black:box=1:boxcolor=0xf5c542@0.95:boxborderw=5:x=6:y=6`,
      "-q:v", "3", `${tmp}/f-${String(n).padStart(3, "0")}.jpg`]);
  }

  const cols = 3;
  const rows = Math.ceil(n / cols);
  await run(["-hide_banner", "-y", "-framerate", "1", "-i", `${tmp}/f-%03d.jpg`,
    "-vf", `tile=${cols}x${rows}:margin=6:padding=6:color=0x0a0e1a`, "-frames:v", "1", "-q:v", "3",
    `/tmp/tut-check/${course}-sheet.jpg`]);
  console.log(`✓ ${course}: ${n} frames → /tmp/tut-check/${course}-sheet.jpg`);
}
main().catch((e) => { console.error(e); process.exit(1); });
