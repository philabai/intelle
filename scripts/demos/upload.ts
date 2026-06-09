import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DEMO, loadEnv } from "./config";

/**
 * Uploads the rendered demo MP4s to the public Supabase Storage bucket so the
 * /regwatch/tutorials page (and external shares) can stream them.
 *
 *   npx tsx scripts/demos/upload.ts
 */

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "regwatch-tutorials";

const FILES = [
  "1-regulations.mp4",
  "2-monitor.mp4",
  "3-comply.mp4",
  "4-author.mp4",
];

async function main() {
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Ensure the public bucket exists.
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["video/mp4"],
      fileSizeLimit: "50MB",
    });
    console.log(`created bucket ${BUCKET}`);
  }

  for (const f of FILES) {
    const path = `tutorials/${f}`;
    const body = readFileSync(join(DEMO.outDir, f));
    const { error } = await sb.storage.from(BUCKET).upload(path, body, {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      console.log(`  ✗ ${f}: ${error.message}`);
      continue;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    console.log(`  ✓ ${path}\n      ${data.publicUrl}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
