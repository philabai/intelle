import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

/**
 * Stage 1 of the tutorial pipeline: sample the raw screen-recording at 1 fps and
 * lay the frames out as timestamped CONTACT SHEETS so the flow can be reviewed
 * a few images at a time (instead of hundreds of stills). Each cell is labelled
 * with its source timecode (H:MM:SS) burned in via drawtext, so the analysis can
 * reference exact in/out points for cutting + caption/narration timing.
 *
 *   npx tsx scripts/tutorials/01-extract-frames.ts <regulations|monitor|comply|author>
 *
 * Output: /tmp/tut-frames/<course>/sheet-NNN.jpg (5x5 grids) + frame-NNNN.jpg (1/sec).
 */

const SRC_DIR =
  "/Users/arnabghosh/Desktop/01. Arnab/00. Business/01. Intelle/01. Documents/Media/Tutorial Videos";
const COURSES: Record<string, string> = {
  regulations: "01. Regulations.mov",
  monitor: "02. Monitor.mov",
  comply: "03. Comply.mov",
  author: "Authoring Documents.mov",
};
const FONT = "/System/Library/Fonts/Supplemental/Arial.ttf";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-600)))));
  });
}

async function main() {
  const course = process.argv[2];
  if (!course || !COURSES[course]) {
    console.error(`usage: tsx 01-extract-frames.ts <${Object.keys(COURSES).join("|")}>`);
    process.exit(1);
  }
  const src = `${SRC_DIR}/${COURSES[course]}`;
  const out = `/tmp/tut-frames/${course}`;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // Timecode label drawn on every 1-fps frame (source seconds via %{pts}).
  const label =
    `drawtext=fontfile=${FONT}:text='%{pts\\:hms}':fontsize=22:fontcolor=yellow:` +
    `box=1:boxcolor=black@0.65:boxborderw=6:x=10:y=10`;

  console.log(`→ ${course}: contact sheets (5x5, ~25s each)…`);
  await run([
    "-hide_banner", "-y", "-i", src,
    "-vf", `fps=1,${label},scale=560:-1,tile=5x5:margin=8:padding=8:color=0x0a0e1a`,
    "-qscale:v", "3",
    `${out}/sheet-%03d.jpg`,
  ]);

  console.log(`→ ${course}: individual 1-fps frames (for spot-checks)…`);
  await run([
    "-hide_banner", "-y", "-i", src,
    "-vf", `fps=1,scale=960:-1`,
    "-qscale:v", "4",
    `${out}/frame-%04d.jpg`,
  ]);

  console.log(`✓ done → ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
