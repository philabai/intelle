"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    title: "", slug: "", body: "", excerpt: "", category: "insight",
    tags: "", cover_image_url: "", status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          body: data.body || "",
          excerpt: data.excerpt || "",
          category: data.category || "insight",
          tags: (data.tags || []).join(", "),
          cover_image_url: data.cover_image_url || "",
          status: data.status || "draft",
        });
        setLoading(false);
      });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) router.push("/admin/articles");
    else setSaving(false);
  }

  const inputStyles = "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Edit Article</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Title</label>
          <input name="title" value={form.title} onChange={handleChange} required className={inputStyles} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
          <input name="slug" value={form.slug} onChange={handleChange} required className={inputStyles} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className={inputStyles}>
              <option value="insight">Insight</option>
              <option value="case-study">Case Study</option>
              <option value="whitepaper">Whitepaper</option>
              <option value="news">News</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputStyles}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Tags (comma-separated)</label>
          <input name="tags" value={form.tags} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Excerpt</label>
          <textarea name="excerpt" value={form.excerpt} onChange={handleChange} rows={2} className={inputStyles} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Cover Image URL</label>
          <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Body (Markdown)</label>
          <textarea name="body" value={form.body} onChange={handleChange} required rows={20} className={`${inputStyles} font-mono`} />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          <Button variant="outline" href="/admin/articles">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
