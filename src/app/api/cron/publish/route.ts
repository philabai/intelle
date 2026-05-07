import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { schedulePost, clampTwitter } from "@/lib/content/buffer";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://intelle.io";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const articlesPublished: string[] = [];
  const linkedinSent: string[] = [];
  const twitterSent: string[] = [];
  const errors: string[] = [];

  // 1. Publish articles whose scheduled_at <= now
  const { data: dueArticles } = await supabase
    .from("articles")
    .select("id, slug")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  for (const a of dueArticles ?? []) {
    const { error } = await supabase
      .from("articles")
      .update({ status: "published", published_at: now })
      .eq("id", a.id);
    if (error) errors.push(`article ${a.id}: ${error.message}`);
    else articlesPublished.push(a.slug);
  }

  // 2. Push LinkedIn variants whose scheduled time has arrived and not yet posted
  const linkedinChannel = process.env.BUFFER_LINKEDIN_CHANNEL_ID;
  if (linkedinChannel) {
    const { data: dueLinkedIn } = await supabase
      .from("articles")
      .select("id, slug, linkedin_body")
      .lte("linkedin_scheduled_at", now)
      .is("linkedin_published_at", null)
      .not("linkedin_body", "is", null);

    for (const a of dueLinkedIn ?? []) {
      try {
        const text = (a.linkedin_body as string).replaceAll(
          "intelle.io/insights/",
          `${SITE_URL.replace(/^https?:\/\//, "")}/insights/`
        );
        const { postId } = await schedulePost({
          channelId: linkedinChannel,
          text,
        });
        await supabase
          .from("articles")
          .update({
            linkedin_published_at: now,
            linkedin_buffer_post_id: postId,
          })
          .eq("id", a.id);
        linkedinSent.push(a.slug);
      } catch (err) {
        errors.push(
          `linkedin ${a.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // 3. Push Twitter variants
  const twitterChannel = process.env.BUFFER_TWITTER_CHANNEL_ID;
  if (twitterChannel) {
    const { data: dueTwitter } = await supabase
      .from("articles")
      .select("id, slug, twitter_body")
      .lte("twitter_scheduled_at", now)
      .is("twitter_published_at", null)
      .not("twitter_body", "is", null);

    for (const a of dueTwitter ?? []) {
      try {
        const text = clampTwitter(
          (a.twitter_body as string).replaceAll(
            "intelle.io/insights/",
            `${SITE_URL.replace(/^https?:\/\//, "")}/insights/`
          )
        );
        const { postId } = await schedulePost({
          channelId: twitterChannel,
          text,
        });
        await supabase
          .from("articles")
          .update({
            twitter_published_at: now,
            twitter_buffer_post_id: postId,
          })
          .eq("id", a.id);
        twitterSent.push(a.slug);
      } catch (err) {
        errors.push(
          `twitter ${a.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    articles_published: articlesPublished,
    linkedin_sent: linkedinSent,
    twitter_sent: twitterSent,
    errors,
  });
}
