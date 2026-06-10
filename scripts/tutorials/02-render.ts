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
 * PER-STEP alignment: each step has its OWN source segment + narration. We TTS
 * each step (Nova) to get its duration d, then build that step's video from its
 * segment fit to exactly d — so the voice and the screen stay in lock-step
 * (the previous section-level fit let them drift apart). Speed is capped at
 * MAX_SPEED (1.7x — the original snappy pace); when a segment is shorter than
 * its narration we hold the last frame instead of slowing it down. Captions are
 * emitted as a cue track for the in-app player (not burned in).
 *
 *   npx tsx scripts/tutorials/02-render.ts <course>
 */

const SRC_DIR =
  "/Users/arnabghosh/Desktop/01. Arnab/00. Business/01. Intelle/01. Documents/Media/Tutorial Videos";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;
const MAX_SPEED = 1.7;
const TTS_INSTRUCTIONS =
  "Warm, friendly, and clear — a calm female product-walkthrough narrator. Natural conversational pace, not rushed, gentle enthusiasm.";

interface Step { caption: string; narration: string; segment: { in: number; out: number } }
interface Section { slug: string; title: string; steps: Step[] }
interface Script { course: string; title: string; description: string; source: string; voice: string; sections: Section[] }

function ff(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(err) : reject(new Error(err.slice(-900)))));
  });
}

async function probeDuration(file: string): Promise<number> {
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
  const script = JSON.parse(readFileSync(`scripts/tutorials/script/${course}.json`, "utf8")) as Script;
  const src = `${SRC_DIR}/${script.source}`;
  const outDir = `scripts/tutorials/out/${course}`;
  const tmp = `/tmp/tut-tts/${course}`;
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const manifest: {
    course: string; title: string; description: string;
    sections: { slug: string; title: string; file: string; durationSec: number; cues: { start: number; end: number; text: string }[] }[];
  } = { course: script.course, title: script.title, description: script.description, sections: [] };

  for (let si = 0; si < script.sections.length; si++) {
    const sec = script.sections[si];
    const nn = String(si + 1).padStart(2, "0");
    console.log(`\n=== ${nn} ${sec.slug} ===`);

    const stepAudios: string[] = [];
    const stepVideos: string[] = [];
    const cues: { start: number; end: number; text: string }[] = [];
    let cursor = 0;

    for (let i = 0; i < sec.steps.length; i++) {
      const step = sec.steps[i];
      // 1. TTS this step → its duration d drives both audio and video length.
      const a = `${tmp}/${nn}-${i}.mp3`;
      await tts(openai, script.voice, step.narration, a);
      const d = await probeDuration(a);
      stepAudios.push(a);
      cues.push({ start: +cursor.toFixed(2), end: +(cursor + d).toFixed(2), text: step.caption });
      cursor += d;

      // 2. Fit this step's segment to EXACTLY d seconds, rendered to its own
      //    clip (seek-based, so backward source jumps between steps can't
      //    corrupt the timeline). Speed up to fit, capped at MAX_SPEED; if the
      //    footage is shorter than the narration, play it at 1x then freeze the
      //    last frame for the remainder (never slow-mo).
      const seg = step.segment;
      const raw = seg.out - seg.in;
      let usedOut = seg.out, pad = 0, mult: number;
      if (raw / d > MAX_SPEED) {
        usedOut = seg.in + d * MAX_SPEED; mult = 1 / MAX_SPEED; // trim tail, play at MAX
      } else if (raw < d) {
        mult = 1; pad = d - raw; // play at 1x, hold last frame for the remainder
      } else {
        mult = d / raw; // speed up to fit exactly
      }
      const len = usedOut - seg.in;
      let vf = `setpts=${mult.toFixed(6)}*(PTS-STARTPTS)`;
      if (pad > 0.04) vf += `,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}`;
      vf += `,fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0e1a,setsar=1`;
      const sv = `${tmp}/${nn}-${i}-v.mp4`;
      await ff(["-hide_banner", "-y", "-ss", seg.in.toString(), "-t", len.toFixed(3), "-i", src,
        "-vf", vf, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-pix_fmt", "yuv420p", "-video_track_timescale", "15360", sv]);
      stepVideos.push(sv);
      console.log(`  step ${i + 1}: "${step.caption}" ${d.toFixed(1)}s  (${(raw / d).toFixed(2)}x${pad > 0.04 ? ", hold" : ""})`);
    }
    const N = cursor;

    // 3. Concat the per-step clips (each already normalised + exactly its
    //    narration long) via the demuxer — no shared-decode timeline to balloon.
    const vlist = `${tmp}/${nn}-vlist.txt`;
    writeFileSync(vlist, stepVideos.map((f) => `file '${f}'`).join("\n"));
    const videoOut = `${tmp}/${nn}-video.mp4`;
    await ff(["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", vlist,
      "-c", "copy", "-movflags", "+faststart", videoOut]);

    // 4. Concat step audios + mux.
    const listFile = `${tmp}/${nn}-list.txt`;
    writeFileSync(listFile, stepAudios.map((f) => `file '${f}'`).join("\n"));
    const audioOut = `${tmp}/${nn}-audio.mp3`;
    await ff(["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c:a", "libmp3lame", "-q:a", "3", audioOut]);

    const file = `${nn}-${sec.slug}.mp4`;
    await ff(["-hide_banner", "-y", "-i", videoOut, "-i", audioOut,
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-shortest", `${outDir}/${file}`]);

    manifest.sections.push({ slug: sec.slug, title: sec.title, file, durationSec: +N.toFixed(2), cues });
    console.log(`  ✓ ${file} (${N.toFixed(1)}s)`);
  }

  writeFileSync(`${outDir}/cues.json`, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ done — ${manifest.sections.length} sections → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
