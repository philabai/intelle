"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function NewArticlePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", slug: "", body: "", excerpt: "", category: "insight" as string,
    tags: "", cover_image_url: "", status: "draft" as string,
  });
  const [saving, setSaving] = useState(false);

  function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "title" && !prev.slug ? { slug: generateSlug(value) } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) router.push("/admin/articles");
    else setSaving(false);
  }

  const inputStyles = "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">New Article</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Title</label>
          <input name="title" value={form.title} onChange={handleChange} required className={inputStyles} placeholder="Article title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
          <input name="slug" value={form.slug} onChange={handleChange} required className={inputStyles} placeholder="article-slug" />
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
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Tags (comma-separated)</label>
          <input name="tags" value={form.tags} onChange={handleChange} className={inputStyles} placeholder="energy, hydrogen, gcc" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Excerpt</label>
          <textarea name="excerpt" value={form.excerpt} onChange={handleChange} rows={2} className={inputStyles} placeholder="Brief description..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Cover Image URL</label>
          <input name="cover_image_url" value={form.cover_image_url} onChange={handleChange} className={inputStyles} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Body (Markdown)</label>
          <textarea name="body" value={form.body} onChange={handleChange} required rows={20} className={`${inputStyles} font-mono`} placeholder="Write your article in Markdown..." />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Article"}</Button>
          <Button variant="outline" href="/admin/articles">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
