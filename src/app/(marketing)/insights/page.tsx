import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import type { Article } from "@/lib/types";

export const metadata: Metadata = {
  title: "Insights & Research",
  description: "Latest insights, research articles, and thought leadership from intelle.io.",
};

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const items = (articles as Article[]) || [];

  const categoryColors: Record<string, string> = {
    insight: "bg-brand-teal/10 text-brand-teal",
    "case-study": "bg-brand-blue/10 text-brand-blue",
    whitepaper: "bg-brand-violet/10 text-brand-violet",
    news: "bg-yellow-500/10 text-yellow-400",
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Insights"
          title="Latest Research & Thinking"
          description="Explore our latest articles, whitepapers, and industry perspectives"
        />

        {items.length === 0 ? (
          <p className="text-center text-muted py-12">No published articles yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((article) => (
              <Card key={article.id} href={`/insights/${article.slug}`} className="p-0 overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-brand-blue/20 to-brand-teal/20" />
                <div className="p-6">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[article.category] || categoryColors.insight}`}>
                    {article.category.replace("-", " ")}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white line-clamp-2">{article.title}</h3>
                  {article.excerpt && <p className="mt-2 text-sm text-muted line-clamp-2">{article.excerpt}</p>}
                  <p className="mt-4 text-xs text-muted/60">
                    {article.published_at ? new Date(article.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
