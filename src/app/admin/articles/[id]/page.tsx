"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PILLARS } from "@/lib/content/pillars";
import { RichEditor } from "@/components/admin/RichEditor";
import { UnicodeFormatHelpers } from "@/components/admin/UnicodeFormatHelpers";
import type { ArticlePillar } from "@/lib/types";

const inputStyles =
  "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}
function fromLocalInputValue(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

type Form = {
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  category: string;
  tags: string;
  cover_image_url: string;
  status: string;
  pillar: string;
  meta_description: string;
  seo_keywords: string;
  scheduled_at: string;
  linkedin_body: string;
  linkedin_scheduled_at: string;
  twitter_body: string;
  twitter_scheduled_at: string;
};

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<Form>({
    title: "", slug: "", body: "", excerpt: "", category: "insight",
    tags: "", cover_image_url: "", status: "draft",
    pillar: "", meta_description: "", seo_keywords: "",
    scheduled_at: "",
    linkedin_body: "", linkedin_scheduled_at: "",
    twitter_body: "", twitter_scheduled_at: "",
  });
  const [linkedinSentAt, setLinkedinSentAt] = useState<string | null>(null);
  const [twitterSentAt, setTwitterSentAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const linkedinRef = useRef<HTMLTextAreaElement | null>(null);

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
          pillar: data.pillar || "",
          meta_description: data.meta_description || "",
          seo_keywords: (data.seo_keywords || []).join(", "),
          scheduled_at: toLocalInputValue(data.scheduled_at),
          linkedin_body: data.linkedin_body || "",
          linkedin_scheduled_at: toLocalInputValue(data.linkedin_scheduled_at),
          twitter_body: data.twitter_body || "",
          twitter_scheduled_at: toLocalInputValue(data.twitter_scheduled_at),
        });
        setLinkedinSentAt(data.linkedin_published_at);
        setTwitterSentAt(data.twitter_published_at);
        setLoading(false);
      });
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function submit(extra?: Partial<Form>) {
    setSaving(true);
    const merged = { ...form, ...extra };
    const payload = {
      title: merged.title,
      slug: merged.slug,
      body: merged.body,
      excerpt: merged.excerpt,
      category: merged.category,
      tags: merged.tags ? merged.tags.split(",").map((t) => t.trim()) : [],
      cover_image_url: merged.cover_image_url,
      status: merged.status,
      pillar: merged.pillar || null,
      meta_description: merged.meta_description || null,
      seo_keywords: merged.seo_keywords
        ? merged.seo_keywords.split(",").map((t) => t.trim())
        : [],
      scheduled_at: fromLocalInputValue(merged.scheduled_at),
      linkedin_body: merged.linkedin_body || null,
      linkedin_scheduled_at: fromLocalInputValue(merged.linkedin_scheduled_at),
      twitter_body: merged.twitter_body || null,
      twitter_scheduled_at: fromLocalInputValue(merged.twitter_scheduled_at),
      published_at:
        merged.status === "published" ? new Date().toISOString() : null,
    };
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) router.push("/admin/articles");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handlePublishNow() {
    if (!confirm("Publish this article now?")) return;
    void submit({ status: "published", scheduled_at: "" });
  }

  function handleSchedule() {
    if (!form.scheduled_at) {
      alert("Pick a scheduled date/time first.");
      return;
    }
    void submit({ status: "scheduled" });
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  const pillarKeys = Object.keys(PILLARS) as ArticlePillar[];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Edit Article</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Core</h2>
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
              <label className="block text-sm font-medium text-foreground mb-2">Pillar</label>
              <select name="pillar" value={form.pillar} onChange={handleChange} className={inputStyles}>
                <option value="">— none —</option>
                {pillarKeys.map((k) => (
                  <option key={k} value={k}>{PILLARS[k].label}</option>
                ))}
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
            <label className="block text-sm font-medium text-foreground mb-2">Body</label>
            <RichEditor
              value={form.body}
              onChange={(md) => setForm((prev) => ({ ...prev, body: md }))}
            />
          </div>
        </section>

        {/* SEO */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">SEO</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Meta description (140–160 chars)</label>
            <textarea
              name="meta_description"
              value={form.meta_description}
              onChange={handleChange}
              rows={2}
              className={inputStyles}
            />
            <p className="text-xs text-muted/60 mt-1">{form.meta_description.length} chars</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">SEO keywords (comma-separated)</label>
            <input name="seo_keywords" value={form.seo_keywords} onChange={handleChange} className={inputStyles} />
          </div>
        </section>

        {/* Schedule + status */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Publishing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputStyles}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Scheduled at</label>
              <input
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                onChange={handleChange}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handlePublishNow}>Publish now</Button>
            <Button type="button" size="sm" variant="outline" onClick={handleSchedule}>Schedule</Button>
          </div>
        </section>

        {/* LinkedIn */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">LinkedIn variant</h2>
          {linkedinSentAt && (
            <p className="text-xs text-brand-teal">
              Posted to LinkedIn at {new Date(linkedinSentAt).toLocaleString()}
            </p>
          )}
          <UnicodeFormatHelpers
            textareaRef={linkedinRef}
            onChange={(v) => setForm((prev) => ({ ...prev, linkedin_body: v }))}
          />
          <textarea
            ref={linkedinRef}
            name="linkedin_body"
            value={form.linkedin_body}
            onChange={handleChange}
            rows={10}
            className={inputStyles}
            placeholder="LinkedIn post (220–320 words)…"
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">LinkedIn scheduled at</label>
            <input
              type="datetime-local"
              name="linkedin_scheduled_at"
              value={form.linkedin_scheduled_at}
              onChange={handleChange}
              className={inputStyles}
              disabled={!!linkedinSentAt}
            />
            <p className="text-xs text-muted/60 mt-1">
              When the cron next runs after this time, the post is sent to Buffer with “Share now”.
            </p>
          </div>
        </section>

        {/* Twitter */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">X (Twitter) variant</h2>
          {twitterSentAt && (
            <p className="text-xs text-brand-teal">
              Posted to X at {new Date(twitterSentAt).toLocaleString()}
            </p>
          )}
          <textarea
            name="twitter_body"
            value={form.twitter_body}
            onChange={handleChange}
            rows={3}
            className={inputStyles}
            placeholder="≤270 chars…"
          />
          <p className="text-xs text-muted/60">{form.twitter_body.length} / 280 chars</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">X scheduled at</label>
            <input
              type="datetime-local"
              name="twitter_scheduled_at"
              value={form.twitter_scheduled_at}
              onChange={handleChange}
              className={inputStyles}
              disabled={!!twitterSentAt}
            />
          </div>
        </section>

        <div className="flex gap-3 pt-4 border-t border-card-border">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button variant="outline" href="/admin/articles">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
