import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/outreach/supabase/service";
import { schedulePost, clampTwitter } from "@/lib/content/buffer";
import { recordOutreachAudit } from "@/lib/outreach/audit";
import type { Platform } from "@/lib/outreach/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Pipeline D — publishing. Finds approved posts whose scheduled_for has arrived
 * and pushes each target platform variant to Buffer, recording one
 * outreach.publications row per platform. No auto-publish: only posts an editor
 * already approved are eligible. Auth: Bearer CRON_SECRET.
 *
 * LinkedIn -> body_medium (+ hashtags), X -> body_short (clamped). newsletter is
 * deferred to a later Brevo pipeline; it is skipped here (left pending).
 */
const BUFFER_CHANNEL: Partial<Record<Platform, string | undefined>> = {
  linkedin: process.env.BUFFER_LINKEDIN_CHANNEL_ID,
  x: process.env.BUFFER_TWITTER_CHANNEL_ID,
};

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function composeText(platform: Platform, post: {
  body_medium: string | null; body_short: string | null; hashtags: string[] | null;
}): string {
  const tags = (post.hashtags ?? []).map((h) => `#${h}`).join(" ");
  if (platform === "x") {
    return clampTwitter([post.body_short ?? "", tags].filter(Boolean).join("\n\n"));
  }
  // linkedin (default)
  return [post.body_medium ?? "", tags].filter(Boolean).join("\n\n");
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date().toISOString();

  const { data: due } = await svc
    .from("posts")
    .select("id, target_platforms, body_medium, body_short, hashtags")
    .eq("status", "approved")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(25);

  const published: string[] = [];
  const errors: string[] = [];

  for (const post of due ?? []) {
    // Mark in-flight so a concurrent tick won't double-publish.
    await svc.from("posts").update({ status: "publishing" }).eq("id", post.id);

    const platforms = (post.target_platforms as Platform[]) ?? [];
    // Newsletter is deferred to the Brevo pipeline; it isn't a Buffer target.
    const targets = platforms.filter((p) => p !== "newsletter");
    let posted = 0;
    let failedPlatforms = 0;

    for (const platform of targets) {
      const channelId = BUFFER_CHANNEL[platform];
      if (!channelId) {
        // No channel wired for this platform — record an explicit failure so it
        // surfaces (rather than silently skipping and faking a "published").
        failedPlatforms += 1;
        errors.push(`${post.id}/${platform}: no Buffer channel configured`);
        await svc.from("publications").insert({
          post_id: post.id,
          platform,
          status: "failed",
          error_message: `No Buffer channel configured (set BUFFER_${platform === "x" ? "TWITTER" : platform.toUpperCase()}_CHANNEL_ID)`,
        });
        continue;
      }
      try {
        const text = composeText(platform, post);
        const { postId } = await schedulePost({ channelId, text });
        await svc.from("publications").insert({
          post_id: post.id,
          platform,
          platform_post_id: postId,
          status: "published",
          published_at: now,
        });
        posted += 1;
      } catch (e) {
        failedPlatforms += 1;
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${post.id}/${platform}: ${message}`);
        await svc.from("publications").insert({
          post_id: post.id,
          platform,
          status: "failed",
          error_message: message,
        });
      }
    }

    // Only mark "published" if at least one platform actually posted. A post
    // where every target was skipped/failed must NOT show green. Per-platform
    // failures are recorded as publication rows regardless.
    const finalStatus = posted > 0 ? "published" : "failed";
    if (failedPlatforms > 0 && posted > 0) {
      errors.push(`${post.id}: partial — ${posted} posted, ${failedPlatforms} failed`);
    }
    await svc.from("posts").update({ status: finalStatus }).eq("id", post.id);
    // Reflect on the calendar if a planned event references this post.
    await svc.from("calendar_events")
      .update({ status: finalStatus === "published" ? "published" : "failed" })
      .eq("post_id", post.id);
    await recordOutreachAudit({
      actorId: null,
      action: finalStatus === "published" ? "post.published" : "post.publish_failed",
      targetType: "post",
      targetId: post.id,
      metadata: { platforms },
    });
    if (finalStatus === "published") published.push(post.id);
  }

  return NextResponse.json({ ok: true, published, errors });
}
