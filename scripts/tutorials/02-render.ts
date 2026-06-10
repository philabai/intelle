import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { spawn } from "node:child_process";
import OpenAI from "openai";

/**
 * Stage 3 — render one course's section clips from its approved script JSON.
 *
 * Per section: TTS each step's narration (Nova) → concatenate → section audio of
 * length N (and per-step caption cue boundaries). Concatenate the kept source
 * `segments` (raw length R), then time-fit the video to N (setpts = N/R — this is
 * what speeds up the slow/idle stretches), normalise to 1920×1080/30fps, and mux
 * the narration. Captions are emitted as a cue track for the in-app player (not
 * burned in).
 *
 *   npx tsx scripts/tutorials/02-render.ts <course>
 *
 * Output: scripts/tutorials/out/<course>/<NN>-<slug>.mp4 + out/<course>/cues.json
 */

const SRC_DIR =
  "/Users/arnabghosh/Desktop/01. Arnab/00. Business/01. Intelle/01. Documents/Media/Tutorial Videos";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;
const TTS_INSTRUCTIONS =
  "Warm, friendly, and clear — a calm female product-walkthrough narrator. Natural conversational pace, not rushed, gentle enthusiasm.";

interface Step { caption: string; narration: string }
interface Section { slug: string; title: string; segments: { in: number; out: number }[]; steps: Step[] }
interface Script { course: string; title: string; description: string; source: string; voice: string; sections: Section[] }

function ff(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(err) : reject(new Error(err.slice(-700)))));
  });
}

async function probeDuration(file: string): Promise<number> {
  // ffmpeg prints Duration: HH:MM:SS.ss to stderr; parse it.
  let err = "";
  await new Promise<void>((resolve) => {
    const p = spawn(FFMPEG, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] });
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", () => resolve());
  });
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error(`could not probe duration of ${file}`);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

async function tts(openai: OpenAI, voice: string, text: string, out: string) {
  let buf: Buffer;
  try {
    const r = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", voice, input: text, instructions: TTS_INSTRUCTIONS, response_format: "mp3",
    });
    buf = Buffer.from(await r.arrayBuffer());
  } catch {
    const r = await openai.audio.speech.create({ model: "tts-1-hd", voice, input: text, response_format: "mp3" });
    buf = Buffer.from(await r.arrayBuffer());
  }
  writeFileSync(out, buf);
}

async function main() {
  const course = process.argv[2];
  const scriptPath = `scripts/tutorials/script/${course}.json`;
  const script = JSON.parse(readFileSync(scriptPath, "utf8")) as Script;
  const src = `${SRC_DIR}/${script.source}`;
  const outDir = `scripts/tutorials/out/${course}`;
  const tmp = `/tmp/tut-tts/${course}`;
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const manifest: {
    course: string; title: string; description: string;
    sections: { slug: string; title: string; file: string; durationSec: number; cues: { start: number; end: number; text: string }[] }[];
  } = { course: script.course, title: script.title, description: script.description, sections: [] };

  for (let si = 0; si < script.sections.length; si++) {
    const sec = script.sections[si];
    const nn = String(si + 1).padStart(2, "0");
    console.log(`\n=== ${nn} ${sec.slug} ===`);

    // 1. TTS each step → durations + caption cues.
    const stepAudios: string[] = [];
    const cues: { start: number; end: number; text: string }[] = [];
    let cursor = 0;
    for (let i = 0; i < sec.steps.length; i++) {
      const a = `${tmp}/${nn}-${i}.mp3`;
      await tts(openai, script.voice, sec.steps[i].narration, a);
      const d = await probeDuration(a);
      cues.push({ start: +cursor.toFixed(2), end: +(cursor + d).toFixed(2), text: sec.steps[i].caption });
      cursor += d;
      stepAudios.push(a);
      console.log(`  step ${i + 1}: "${sec.steps[i].caption}" (${d.toFixed(1)}s)`);
    }
    const N = cursor; // total narration seconds

    // 2. Concatenate step audios → section audio.
    const listFile = `${tmp}/${nn}-list.txt`;
    writeFileSync(listFile, stepAudios.map((f) => `file '${f}'`).join("\n"));
    const audioOut = `${tmp}/${nn}-audio.mp3`;
    await ff(["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c:a", "libmp3lame", "-q:a", "3", audioOut]);

    // 3. Build the silent video: trim+concat kept segments, time-fit to N, normalise.
    const R = sec.segments.reduce((n, s) => n + (s.out - s.in), 0);
    const factor = N / R; // setpts multiplier: >1 slows, <1 speeds
    const trims = sec.segments.map((s, i) => `[0:v]trim=start=${s.in}:end=${s.out},setpts=PTS-STARTPTS[v${i}]`);
    const cat = sec.segments.map((_, i) => `[v${i}]`).join("");
    const filter = [
      ...trims,
      `${cat}concat=n=${sec.segments.length}:v=1:a=0[vc]`,
      `[vc]setpts=${factor.toFixed(6)}*PTS,fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0e1a,setsar=1[vout]`,
    ].join(";");
    const videoOut = `${tmp}/${nn}-video.mp4`;
    await ff(["-hide_banner", "-y", "-i", src, "-filter_complex", filter, "-map", "[vout]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", videoOut]);
    console.log(`  video: ${R}s raw → ${N.toFixed(1)}s (${(1 / factor).toFixed(2)}x speed)`);

    // 4. Mux narration onto the video.
    const file = `${nn}-${sec.slug}.mp4`;
    await ff(["-hide_banner", "-y", "-i", videoOut, "-i", audioOut,
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-shortest", `${outDir}/${file}`]);

    manifest.sections.push({ slug: sec.slug, title: sec.title, file, durationSec: +N.toFixed(2), cues });
    console.log(`  ✓ ${file}`);
  }

  writeFileSync(`${outDir}/cues.json`, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ done — ${manifest.sections.length} sections → ${outDir} (+ cues.json)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
