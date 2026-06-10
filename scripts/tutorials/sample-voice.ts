import { readFileSync, writeFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import OpenAI from "openai";

/**
 * Generate a short narration sample so the user can approve the voice before we
 * narrate every section. Uses gpt-4o-mini-tts (natural, supports a tone
 * instruction); falls back to tts-1-hd if unavailable.
 *
 *   npx tsx scripts/tutorials/sample-voice.ts [voice]   # default: nova
 */

const VOICE = process.argv[2] || "nova";
const OUT = `${process.env.HOME}/Downloads/tutorial-voice-sample-${VOICE}.mp3`;
const INSTRUCTIONS =
  "Warm, friendly, and clear — a calm female product-walkthrough narrator. Natural conversational pace, not rushed, gentle enthusiasm.";
const TEXT =
  "Vantage tracks over eleven thousand regulations from regulators around the world. " +
  "From the Regulations menu, you can browse the entire corpus by country. " +
  "Each tile is a jurisdiction — the United States, the European Union, Canada, Saudi Arabia and more — " +
  "showing how many regulations it covers and how many changed this month. " +
  "Click any regulation to open it, and Vantage extracts the full text into clean, readable articles, right inside the app.";

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let buf: Buffer;
  try {
    const res = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: VOICE,
      input: TEXT,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
    });
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.log(`gpt-4o-mini-tts failed (${(e as Error).message}); falling back to tts-1-hd`);
    const res = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: VOICE,
      input: TEXT,
      response_format: "mp3",
    });
    buf = Buffer.from(await res.arrayBuffer());
  }
  writeFileSync(OUT, buf);
  console.log(`✓ wrote ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
