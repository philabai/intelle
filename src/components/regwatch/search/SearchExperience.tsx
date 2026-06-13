"use client";

import { useEffect, useRef, useState } from "react";
import type { RegulationListItem } from "@/lib/regwatch/queries";
import type { CompanyDocResult } from "@/lib/regwatch/internal-document-search";
import type { AssetSearchResult } from "@/lib/regwatch/assets";
import { PreviewDrawer, type PreviewTarget } from "./PreviewDrawer";

const ASSET_LEVEL_LABEL: Record<number, string> = {
  2: "Site",
  3: "Area",
  4: "Asset class",
  5: "Asset",
  6: "Component",
};

interface CitationSource {
  id: string;
  kind: "regulation" | "doc";
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

interface IrisFilters {
  instrumentTypes?: string[];
  regulators?: string[];
  topics?: string[];
  statuses?: string[];
}

interface DocScope {
  folderIds: string[];
  includeUnfiled: boolean;
}

/**
 * The whole search-results experience in one client component so the layout can
 * be: MAIN column (Iris synthesis + result lists) | SIDEBAR (sources, sticky +
 * self-scrolling). Because results live in the main column and sources in a
 * parallel sidebar, a long source list never pushes the results down.
 *
 * Clicking any citation, source card, or result row opens a right-side preview
 * drawer (PreviewDrawer) rather than navigating away.
 */
export function SearchExperience({
  query,
  filters,
  docScope,
  regulations,
  companyDocs,
  docsOn,
  assets,
  assetsOn,
}: {
  query: string;
  filters?: IrisFilters;
  docScope?: DocScope;
  regulations: RegulationListItem[];
  companyDocs: CompanyDocResult[];
  docsOn: boolean;
  assets: AssetSearchResult[];
  assetsOn: boolean;
}) {
  const [text, setText] = useState("");
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);
  const sig = JSON.stringify({ filters: filters ?? {}, docScope: docScope ?? null });

  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const open = (kind: "regulation" | "doc" | "asset", id: string) =>
    setPreview({ kind, id });

  useEffect(() => {
    const runKey = `${query}|${sig}`;
    if (!query || startedRef.current === runKey) return;
    startedRef.current = runKey;
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
          body: JSON.stringify({
            query,
            instrumentTypes: filters?.instrumentTypes,
            regulators: filters?.regulators,
            topics: filters?.topics,
            statuses: filters?.statuses,
            docs: !!docScope,
            docFolderIds: docScope?.folderIds,
            includeUnfiled: docScope?.includeUnfiled,
          }),
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
          let nl: number;
          while ((nl = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 2);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6);
              if (!jsonStr) continue;
              try {
                const ev = JSON.parse(jsonStr) as StreamEvent;
                if (ev.type === "sources" && ev.sources) setSources(ev.sources);
                else if (ev.type === "delta" && ev.text) setText((p) => p + ev.text);
                else if (ev.type === "done") setDone(true);
                else if (ev.type === "error") {
                  setError(ev.message ?? "Iris encountered an error.");
                  setDone(true);
                }
              } catch {
                /* ignore malformed line */
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
  }, [query, sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const rendered = renderCitations(text, sources, open);
  const usedIndices = new Set<number>();
  if (done) {
    for (const m of text.matchAll(/\[(\d+)\]/g)) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= sources.length) usedIndices.add(n);
    }
  }
  const unused = sources
    .map((s, i) => ({ n: i + 1, s }))
    .filter((x) => !usedIndices.has(x.n));

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* MAIN — synthesis + result lists */}
        <div className="min-w-0 space-y-6">
          <article>
            <div className="rounded-xl border border-brand-violet/30 bg-brand-violet/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-violet/30 text-[10px] font-semibold text-brand-violet">
                  I
                </span>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-violet">
                  Iris synthesis
                </p>
                {!done && <span className="ms-2 text-xs text-muted">streaming…</span>}
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
              {done && unused.length > 0 && (
                <div className="mt-4 border-t border-brand-violet/20 pt-3">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                    Also reviewed (not cited inline)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unused.map(({ n, s }) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => open(s.kind, s.id)}
                        title={`${s.regulator} — ${s.title}`}
                        className="inline-flex items-center gap-1 rounded border border-card-border bg-card-bg/60 px-1.5 py-0.5 text-[11px] text-muted hover:border-brand-teal hover:text-brand-teal"
                      >
                        <span className="font-mono text-brand-teal">[{n}]</span>
                        <span className="max-w-[160px] truncate">{s.citation}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              AI-generated synthesis. Verify every claim against the cited source before
              relying on it for compliance evidence.
            </p>
          </article>

          <ResultSection
            label={`${regulations.length} ${regulations.length === 1 ? "match" : "matches"} in the corpus`}
            empty={regulations.length === 0}
            emptyText="No corpus rows matched your keywords. Iris may still answer from related items above."
          >
            {regulations.map((r) => (
              <RegRow key={r.id} item={r} onOpen={() => open("regulation", r.id)} />
            ))}
          </ResultSection>

          {docsOn && (
            <ResultSection
              accent
              label={`${companyDocs.length} ${companyDocs.length === 1 ? "match" : "matches"} in your company documents`}
              empty={companyDocs.length === 0}
              emptyText="No company documents matched. Try a broader query or widen the folder selection."
            >
              {companyDocs.map((d) => (
                <DocRow key={d.id} doc={d} onOpen={() => open("doc", d.id)} />
              ))}
            </ResultSection>
          )}

          {assetsOn && (
            <ResultSection
              accent
              label={`${assets.length} ${assets.length === 1 ? "match" : "matches"} in your assets`}
              empty={assets.length === 0}
              emptyText="No assets matched that name or code. Try a different term."
            >
              {assets.map((a) => (
                <AssetRow key={a.id} asset={a} onOpen={() => open("asset", a.id)} />
              ))}
            </ResultSection>
          )}
        </div>

        {/* SIDEBAR — sources, sticky + self-scrolling so it never pushes results down */}
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-auto">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Sources{sources.length > 0 ? ` (${sources.length})` : ""}
          </p>
          {sources.length === 0 ? (
            <p className="text-xs text-muted">
              {done ? "No sources surfaced." : "Iris is searching…"}
            </p>
          ) : (
            <ol className="space-y-1.5">
              {sources.map((s, idx) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => open(s.kind, s.id)}
                    className="w-full rounded-md border border-card-border bg-card-bg p-2.5 text-start text-xs transition hover:border-brand-teal/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-brand-teal">[{idx + 1}]</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                          s.kind === "doc"
                            ? "bg-brand-teal/20 text-brand-teal"
                            : "bg-brand-navy/60 text-muted"
                        }`}
                      >
                        {s.kind === "doc" ? "Doc" : s.jurisdiction_code}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 font-medium text-foreground">{s.title}</p>
                    <p className="truncate font-mono text-[10px] text-muted">{s.citation}</p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <PreviewDrawer target={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function ResultSection({
  label,
  empty,
  emptyText,
  accent,
  children,
}: {
  label: string;
  empty: boolean;
  emptyText: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p
        className={`mb-2 text-xs font-medium uppercase tracking-wider ${
          accent ? "text-brand-teal" : "text-muted"
        }`}
      >
        {label}
      </p>
      {empty ? (
        <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 px-4 py-6 text-center text-xs text-muted">
          {emptyText}
        </p>
      ) : (
        <div
          className={`overflow-hidden rounded-xl border bg-background ${
            accent ? "border-brand-teal/30" : "border-card-border"
          }`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function RegRow({
  item,
  onOpen,
}: {
  item: RegulationListItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="search-result"
      className="block w-full border-b border-card-border px-4 py-3 text-start last:border-b-0 hover:bg-card-bg/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          {item.jurisdiction_code}
        </span>
        <span className="font-mono text-[11px] text-muted">{item.citation}</span>
        <span className="ms-auto text-[10px] text-muted">
          {item.regulator?.short_name ?? item.regulator?.name}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{item.title}</p>
      {item.summary && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.summary}</p>
      )}
    </button>
  );
}

function DocRow({ doc, onOpen }: { doc: CompanyDocResult; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full border-b border-card-border px-4 py-3 text-start last:border-b-0 hover:bg-card-bg/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-teal">
          {doc.docKind.replace(/[-_]+/g, " ")}
        </span>
        {doc.internalCode && (
          <span className="font-mono text-[11px] text-muted">{doc.internalCode}</span>
        )}
        <span className="ms-auto text-[10px] text-muted">{doc.folderName ?? "Unfiled"}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{doc.title}</p>
      {doc.snippet && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{renderSnippet(doc.snippet)}</p>
      )}
    </button>
  );
}

function AssetRow({ asset, onOpen }: { asset: AssetSearchResult; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full border-b border-card-border px-4 py-3 text-start last:border-b-0 hover:bg-card-bg/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-teal">
          {ASSET_LEVEL_LABEL[asset.level] ?? `Level ${asset.level}`}
        </span>
        {asset.code && (
          <span className="font-mono text-[11px] text-muted">{asset.code}</span>
        )}
        {asset.assetType && (
          <span className="ms-auto text-[10px] text-muted">{asset.assetType}</span>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{asset.name}</p>
    </button>
  );
}

/** Highlights in ts_headline snippets are wrapped in ⟦…⟧ — render as escaped text. */
function renderSnippet(snippet: string) {
  return snippet.split(/⟦|⟧/).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-brand-teal/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Replace [n] tokens with clickable chips that open the preview drawer. */
function renderCitations(
  text: string,
  sources: CitationSource[],
  open: (kind: "regulation" | "doc", id: string) => void,
): React.ReactNode[] {
  if (!text) return [];
  return text.split(/(\[\d+\])/g).map((p, idx) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (!m) return <span key={idx}>{p}</span>;
    const n = parseInt(m[1], 10);
    const src = sources[n - 1];
    if (!src) return <span key={idx}>{p}</span>;
    return (
      <button
        key={idx}
        type="button"
        onClick={() => open(src.kind, src.id)}
        title={`${src.regulator} — ${src.title}`}
        className="inline-flex items-baseline rounded bg-brand-teal/15 px-1 py-0 align-baseline font-mono text-[11px] font-semibold text-brand-teal hover:bg-brand-teal/30"
      >
        [{n}]
      </button>
    );
  });
}
