import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JsonLd, articleSchema } from "@/lib/seo/json-ld";
import { HeroCard } from "@/components/insights/HeroCard";
import { ArticleBody } from "@/components/insights/ArticleBody";
import { KeyTakeaways } from "@/components/insights/KeyTakeaways";
import { AboutAuthor } from "@/components/insights/AboutAuthor";
import { splitKeyTakeaways } from "@/lib/markdown-body";
import type { Article } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("title, excerpt, meta_description, seo_keywords, cover_image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (!data) return { title: "Article Not Found" };
  const description = data.meta_description || data.excerpt || "";
  return {
    title: data.title,
    description,
    keywords: data.seo_keywords?.length ? data.seo_keywords : undefined,
    alternates: { canonical: `/insights/${slug}` },
    openGraph: {
      title: data.title,
      description,
      type: "article",
      url: `/insights/${slug}`,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description,
      images: data.cover_image_url ? [data.cover_image_url] : undefined,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) notFound();
  const article = data as Article;
  const { before, takeaways, tail } = splitKeyTakeaways(article.body);

  return (
    <>
      <JsonLd
        data={articleSchema({
          title: article.title,
          description: article.meta_description || article.excerpt || "",
          url: `/insights/${article.slug}`,
          publishedAt: article.published_at || article.created_at,
          authorName: article.author_name,
          imageUrl: article.cover_image_url || undefined,
        })}
      />

      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-heading">Home</Link><span>/</span>
            <Link href="/insights" className="hover:text-heading">Insights</Link><span>/</span>
            <span className="text-heading line-clamp-1">{article.title}</span>
          </nav>
        </div>
      </div>

      <article className="py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <HeroCard article={article} />

          <ArticleBody markdown={before} />

          {takeaways && <KeyTakeaways items={takeaways} />}

          {tail && <ArticleBody markdown={tail} />}

          {article.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-card-border text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <AboutAuthor authorName={article.author_name} />
        </div>
      </article>
    </>
  );
}
