"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PILLARS } from "@/lib/content/pillars";
import type { ArticlePillar } from "@/lib/types";

const inputStyles =
  "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

export default function GenerateArticlePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [pillar, setPillar] = useState<ArticlePillar>("industry_insight");
  const [keywords, setKeywords] = useState("");
  const [wordTarget, setWordTarget] = useState(3500);
  const [extraContext, setExtraContext] = useState("");
  const [example1, setExample1] = useState("");
  const [example2, setExample2] = useState("");
  const [status, setStatus] = useState<
    "idle" | "generating" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("generating");
    setErrorMsg(null);
    try {
      const exampleArticles = [example1, example2]
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          pillar,
          keywords: keywords
            ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
            : undefined,
          wordTarget,
          extraContext: extraContext || undefined,
          exampleArticles: exampleArticles.length ? exampleArticles : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Generation failed");
        return;
      }
      router.push(`/admin/articles/${data.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">Generate Article</h1>
      <p className="text-sm text-muted mb-8">
        Claude Opus 4.7 writes the long-form article plus LinkedIn and X variants.
        Generation usually takes 90–180 seconds. Stay on the page.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Topic <span className="text-red-400">*</span>
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            rows={3}
            className={inputStyles}
            placeholder="e.g. How NOCs in the GCC should evaluate hydrogen offtake economics in 2026"
          />
          <p className="text-xs text-muted/60 mt-1">
            One or two sentences describing the article angle. Specific is better.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Pillar <span className="text-red-400">*</span>
            </label>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value as ArticlePillar)}
              className={inputStyles}
            >
              {(Object.keys(PILLARS) as ArticlePillar[]).map((k) => (
                <option key={k} value={k}>
                  {PILLARS[k].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted/60 mt-1">{PILLARS[pillar].oneLine}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Word target
            </label>
            <input
              type="number"
              min={800}
              max={6000}
              step={100}
              value={wordTarget}
              onChange={(e) => setWordTarget(Number(e.target.value))}
              className={inputStyles}
            />
            <p className="text-xs text-muted/60 mt-1">
              Default 3500. Acceptable variance ±10%.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Target keywords
          </label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className={inputStyles}
            placeholder="hydrogen offtake, GCC energy, NOC strategy"
          />
          <p className="text-xs text-muted/60 mt-1">
            Comma-separated phrases. Woven in naturally — no stuffing.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Extra context (optional)
          </label>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={4}
            className={inputStyles}
            placeholder="Specific data points, recent client conversations, references to include, points of view to take, things to avoid..."
          />
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Reference articles (optional)
            </h2>
            <p className="text-xs text-muted/60 mt-1">
              Paste up to 2 articles whose <strong>structure, paragraph rhythm, density, and quality bar</strong> Claude should match.
              Markdown. The model uses them as style references — it will not copy phrasing or content.
              <br />
              Adding even one strong reference is the single biggest lever on output quality.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Example article 1
            </label>
            <textarea
              value={example1}
              onChange={(e) => setExample1(e.target.value)}
              rows={10}
              className={`${inputStyles} font-mono text-xs`}
              placeholder="Paste full article markdown here…"
            />
            <p className="text-xs text-muted/60 mt-1">
              {example1.trim().length
                ? `${example1.trim().length.toLocaleString()} chars · ~${Math.round(
                    example1.trim().split(/\s+/).filter(Boolean).length
                  ).toLocaleString()} words`
                : "Empty"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Example article 2
            </label>
            <textarea
              value={example2}
              onChange={(e) => setExample2(e.target.value)}
              rows={10}
              className={`${inputStyles} font-mono text-xs`}
              placeholder="Paste full article markdown here…"
            />
            <p className="text-xs text-muted/60 mt-1">
              {example2.trim().length
                ? `${example2.trim().length.toLocaleString()} chars · ~${Math.round(
                    example2.trim().split(/\s+/).filter(Boolean).length
                  ).toLocaleString()} words`
                : "Empty"}
            </p>
          </div>
        </div>

        {status === "error" && errorMsg && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {status === "generating" && (
          <div className="p-4 rounded-lg bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-sm">
            Generating… Opus 4.7 is writing your article. This can take 90–180 seconds.
            Don&apos;t close this tab.
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={status === "generating" || !topic.trim()}>
            {status === "generating" ? "Generating…" : "Generate"}
          </Button>
          <Button variant="outline" href="/admin/articles">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
