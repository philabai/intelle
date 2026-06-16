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
    let anyFailed = false;
    let anyPosted = false;

    for (const platform of platforms) {
      if (platform === "newsletter") continue; // deferred to Brevo pipeline
      const channelId = BUFFER_CHANNEL[platform];
      if (!channelId) {
        errors.push(`${post.id}/${platform}: no Buffer channel configured`);
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
        anyPosted = true;
      } catch (e) {
        anyFailed = true;
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

    const finalStatus = anyFailed && !anyPosted ? "failed" : "published";
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
