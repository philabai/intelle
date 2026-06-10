import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createClient } from "@supabase/supabase-js";

/**
 * Stage 4 — upload a course's rendered section clips to the public
 * `regwatch-tutorials` bucket and merge the course into the committed player
 * config `src/lib/regwatch/tutorials.data.json` (sections + caption cues).
 *
 *   npx tsx scripts/tutorials/03-upload.ts <course>
 *
 * Idempotent: re-uploads (upsert) and replaces only this course in the config.
 */

const BUCKET = "regwatch-tutorials";
const DATA = "src/lib/regwatch/tutorials.data.json";

interface SectionManifest { slug: string; title: string; file: string; durationSec: number; cues: { start: number; end: number; text: string }[] }
interface Manifest { course: string; title: string; description: string; sections: SectionManifest[] }

async function main() {
  const course = process.argv[2];
  const outDir = `scripts/tutorials/out/${course}`;
  const manifest = JSON.parse(readFileSync(`${outDir}/cues.json`, "utf8")) as Manifest;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  // Ensure bucket exists (public, mp4).
  await sb.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: ["video/mp4"], fileSizeLimit: "50MB" }).catch(() => {});

  console.log(`→ uploading ${manifest.sections.length} clips for ${course}…`);
  for (const s of manifest.sections) {
    const path = `tutorials/${course}/${s.file}`;
    const body = readFileSync(`${outDir}/${s.file}`);
    const up = await sb.storage.from(BUCKET).upload(path, body, { contentType: "video/mp4", upsert: true, cacheControl: "3600" });
    if (up.error) throw new Error(`upload ${path}: ${up.error.message}`);
    console.log(`  ✓ ${path} (${(body.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Merge into the committed player config (replace this course, keep others).
  const courseConfig = {
    slug: manifest.course,
    title: manifest.title,
    description: manifest.description,
    sections: manifest.sections.map((s) => ({
      slug: s.slug,
      title: s.title,
      file: `tutorials/${course}/${s.file}`,
      durationSec: s.durationSec,
      cues: s.cues,
    })),
  };
  const existing: { courses: (typeof courseConfig)[] } = existsSync(DATA)
    ? JSON.parse(readFileSync(DATA, "utf8"))
    : { courses: [] };
  existing.courses = existing.courses.filter((c) => c.slug !== course);
  existing.courses.push(courseConfig);
  // Stable order: regulations, monitor, comply, author.
  const order = ["regulations", "monitor", "comply", "author"];
  existing.courses.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  writeFileSync(DATA, JSON.stringify(existing, null, 2) + "\n");

  console.log(`\n✓ uploaded + merged "${course}" into ${DATA}`);
  console.log(`  out/${course}: ${readdirSync(outDir).filter((f) => f.endsWith(".mp4")).length} clips`);
}

main().catch((e) => { console.error(e); process.exit(1); });
