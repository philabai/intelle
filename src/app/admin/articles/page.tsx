"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Article } from "@/lib/types";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((data) => { setArticles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  const statusColors: Record<string, string> = {
    published: "bg-brand-teal/10 text-brand-teal",
    scheduled: "bg-brand-blue/10 text-brand-blue",
    draft: "bg-yellow-500/10 text-yellow-400",
    archived: "bg-red-500/10 text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Articles</h1>
        <div className="flex gap-2">
          <Button href="/admin/articles/generate" size="sm">Generate (AI)</Button>
          <Button href="/admin/articles/new" size="sm" variant="outline">New (manual)</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : articles.length === 0 ? (
        <p className="text-muted">No articles yet.</p>
      ) : (
        <div className="rounded-xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card-bg">
              <tr className="text-left text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Pillar</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-card-bg/50">
                  <td className="px-4 py-3 text-white font-medium">{article.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[article.status]}`}>{article.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{article.pillar ?? article.category}</td>
                  <td className="px-4 py-3 text-muted">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString()
                      : article.scheduled_at
                        ? `→ ${new Date(article.scheduled_at).toLocaleDateString()}`
                        : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/articles/${article.id}`} className="text-brand-blue hover:text-brand-blue/80 text-sm">Edit</Link>
                      <button onClick={() => handleDelete(article.id)} className="text-red-400 hover:text-red-300 text-sm cursor-pointer">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
