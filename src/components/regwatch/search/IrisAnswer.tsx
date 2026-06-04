"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface CitationSource {
  id: string;
  citation: string;
  title: string;
  jurisdiction_code: string;
  slug: string;
  regulator: string;
  source_url: string;
}

interface StreamEvent {
  type: "sources" | "delta" | "done" | "error";
  text?: string;
  message?: string;
  sources?: CitationSource[];
}

/**
 * Iris Q&A panel — streams a Claude synthesis with [n] inline citations
 * resolved from the corpus. Right-rail Sources Panel is rendered alongside.
 *
 * Implementation note: post-Stanford-RegLab, citations are NOT asked of the
 * LLM directly. Instead the server returns a list of items the model was
 * primed with, and Claude is instructed to reference them as [n] tokens. The
 * client then renders [n] → hover-preview anchored to sources[n-1].
 */
export function IrisAnswer({ query }: { query: string }) {
  const [text, setText] = useState("");
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query || startedRef.current === query) return;
    startedRef.current = query;
    setText("");
    setSources([]);
    setDone(false);
    setError(null);

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/regwatch/iris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("No response body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          let nlIndex: number;
          while ((nlIndex = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, nlIndex);
            buffer = buffer.slice(nlIndex + 2);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice("data: ".length);
              if (!json) continue;
              try {
                const ev = JSON.parse(json) as StreamEvent;
                if (ev.type === "sources" && ev.sources) {
                  setSources(ev.sources);
                } else if (ev.type === "delta" && ev.text) {
                  setText((prev) => prev + ev.text);
                } else if (ev.type === "done") {
                  setDone(true);
                } else if (ev.type === "error") {
                  setError(ev.message ?? "Iris encountered an error.");
                  setDone(true);
                }
              } catch {
                /* ignore malformed lines */
              }
            }
          }
        }
        setDone(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
        setDone(true);
      }
    })();

    return () => controller.abort();
  }, [query]);

  const rendered = renderCitations(text, sources);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <article>
        <div className="rounded-xl border border-brand-violet/30 bg-brand-violet/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-violet/30 text-[10px] font-semibold text-brand-violet">
              I
            </span>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-violet">
              Iris synthesis
            </p>
            {!done && <span className="ml-2 text-xs text-muted">streaming…</span>}
          </div>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {sources.length > 0 && (
            <p className="mb-3 text-[11px] text-muted">
              Answered from:{" "}
              {Array.from(new Set(sources.map((s) => s.regulator))).join(", ")}
            </p>
          )}
          <div className="prose prose-invert max-w-none text-sm">
            {rendered.length === 0 && !done ? (
              <p className="text-muted">Synthesising an answer from the corpus…</p>
            ) : (
              <p className="whitespace-pre-wrap">{rendered}</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          AI-generated synthesis. Verify every claim against the cited source before
          relying on it for compliance evidence.
        </p>
      </article>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Sources
        </p>
        {sources.length === 0 ? (
          <p className="text-xs text-muted">
            No corpus sources surfaced yet — Iris is searching.
          </p>
        ) : (
          <ol className="space-y-2">
            {sources.map((s, idx) => (
              <li
                key={s.id}
                className="rounded-md border border-card-border bg-card-bg p-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-brand-teal">[{idx + 1}]</span>
                  <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                    {s.jurisdiction_code}
                  </span>
                </div>
                <p className="mt-1 font-medium text-foreground">{s.title}</p>
                <p className="font-mono text-[10px] text-muted">{s.citation}</p>
                <p className="text-[11px] text-muted">{s.regulator}</p>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/regwatch/r/${s.jurisdiction_code.toLowerCase()}/${s.slug}`}
                    className="text-brand-teal hover:underline"
                  >
                    Open
                  </Link>
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground"
                  >
                    Source ↗
                  </a>
                </div>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

/**
 * Replace [n] tokens with React fragments that include a tooltip-ish anchor.
 * Falls back to raw text if a referenced source doesn't exist.
 */
function renderCitations(text: string, sources: CitationSource[]): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((p, idx) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (!m) return <span key={idx}>{p}</span>;
    const n = parseInt(m[1], 10);
    const src = sources[n - 1];
    if (!src) return <span key={idx}>{p}</span>;
    return (
      <a
        key={idx}
        href={`/regwatch/r/${src.jurisdiction_code.toLowerCase()}/${src.slug}`}
        title={`${src.regulator} — ${src.title}`}
        className="inline-flex items-baseline rounded bg-brand-teal/15 px-1 py-0 font-mono text-[11px] font-semibold text-brand-teal no-underline hover:bg-brand-teal/30"
      >
        [{n}]
      </a>
    );
  });
}
