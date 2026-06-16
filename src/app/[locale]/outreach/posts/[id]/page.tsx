import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/outreach/supabase/server";
import { PostEditor } from "@/components/outreach/PostEditor";
import type { OutreachPost } from "@/lib/outreach/types";

export const metadata = { title: "Review post — Outreach" };

export default async function OutreachPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*, pillar:content_pillars(name)")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const pillar = Array.isArray(post.pillar) ? post.pillar[0] : post.pillar;

  return (
    <div className="max-w-5xl">
      <Link href="/outreach/queue" className="text-xs text-muted hover:text-white">← Review queue</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">{post.title ?? "Untitled draft"}</h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted">{post.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {pillar?.name} · {(post.target_geos ?? []).join(", ") || "international"} ·{" "}
        {(post.target_platforms ?? []).join(", ")}
        {post.ai_confidence != null && ` · AI confidence ${Math.round(Number(post.ai_confidence) * 100)}%`}
      </p>

      <PostEditor post={post as unknown as OutreachPost} />
    </div>
  );
}
