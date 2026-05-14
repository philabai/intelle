import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";

const BASE_URL = "https://intelle.io";

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
    const { data } = await supabase
      .from("articles")
      .select("slug, published_at, updated_at")
      .eq("status", "published");

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
