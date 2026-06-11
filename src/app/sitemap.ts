import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";

const BASE_URL = "https://intelle.io";

// Render on-demand, NOT at build time. The sitemap queries Supabase for
// published articles; baking it into the static export meant a Supabase blip at
// build time hung past the 60s page-gen limit and failed the whole deploy. As a
// dynamic route the build never depends on the DB — it renders per request,
// bounded by the abort timeout below, and degrades to the static URL list if
// Supabase is unreachable.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "",
    "/research",
    "/research/energy",
    "/research/standards",
    "/research/ai-digitalization",
    "/research/technology-scouting",
    "/research/market-intelligence",
    "/research/patent-ip",
    "/research/strategic",
    "/engineering",
    "/engineering/workbench-adoption",
    "/engineering/plm-integration",
    "/engineering/knowledge-management-strategy",
    "/engineering/knowledge-management-implementation",
    "/engineering/compliance-advisory",
    "/industries",
    "/industries/oil-gas",
    "/industries/aerospace-defense",
    "/industries/medical-devices",
    "/industries/manufacturing",
    "/insights",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path.split("/").length <= 2 ? 0.8 : 0.6,
  }));

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceClient();
    // Hard-bounded query: race the Supabase fetch against an 8s timeout so a
    // slow/unreachable DB can never hang the response (abortSignal alone didn't
    // reliably unblock a stalled connection). On timeout we ship the static URL
    // list and move on.
    const query = supabase
      .from("articles")
      .select("slug, published_at, updated_at")
      .eq("status", "published")
      .abortSignal(AbortSignal.timeout(8000));
    const data = await Promise.race([
      query.then(
        (r) => r.data,
        () => null,
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8500)),
    ]);

    if (data) {
      articlePages = data.map((article) => ({
        url: `${BASE_URL}/insights/${article.slug}`,
        lastModified: new Date(article.updated_at || article.published_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Supabase not configured yet -- skip dynamic pages
  }

  return [...staticPages, ...articlePages];
}
