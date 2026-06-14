"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

/**
 * Floating Iris chatbot. Bubble in the bottom-right, click to open a chat
 * drawer. Multi-turn conversation; supports scoping to a single regulation
 * when the user is on a regulation detail or briefing page (we read the
 * pathname to detect that context).
 *
 * Conversation history lives in component state — closing + reopening within
 * the same page session preserves it. Refreshing the page or navigating away
 * resets the conversation (intentional: keeps things lightweight for v1).
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: CitationSource[];
}

interface CitationSource {
  id: string;
  citation: string;
  title: string;
  jurisdiction_code: string;
  slug: string;
  regulator: string;
  source_url: string;
}

type Scope = { kind: "global" } | { kind: "regulation"; slug: string };

/**
 * Resolve the chat scope from the current URL. We can't easily fetch the
 * regulatory_items.id from the slug here without a round-trip — instead the
 * server-side widget mount passes scoped id via a separate hook (see below).
 * For v1 we run global on every page; an "Ask about this regulation" CTA on
 * the detail page can call setScopedItem directly.
 */
function scopeFromPath(pathname: string): Scope {
  // Pathnames like /regwatch/r/us/40-cfr-261-4 — extract slug, use for label
  const m = pathname.match(/^\/regwatch\/r\/[^/]+\/([^/?]+)/);
  if (m) return { kind: "regulation", slug: m[1] };
  return { kind: "global" };
}

interface Props {
  /** Optional regulatory_items.id used for scoped Q&A (passed by detail page). */
  scopedItemId?: string;
  /** Optional citation shown in the header when scoped. */
  scopedItemCitation?: string;
}

export function RegwatchChatWidget({
  scopedItemId,
  scopedItemCitation,
}: Props) {
  const t = useTranslations("regwatch.common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"corpus" | "help">("corpus");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pathScope = scopeFromPath(pathname);
  // Effective scope: explicit prop wins, otherwise infer from URL slug for
  // display only (we can't query without the id — global retrieval as fallback).
  const headerLabel =
    scopedItemCitation ??
    (pathScope.kind === "regulation" ? `${pathScope.slug}` : null);
  const effectiveScopedId = scopedItemId; // explicit id only

  // The HelpButton dispatches "vantage:iris-mode" with detail "help" when
  // the user clicks "Open Iris in Help mode". Switch the widget, open it,
  // and reset prior corpus messages so the user starts fresh in help mode.
  useEffect(() => {
    function onModeRequest(e: Event) {
      const m = (e as CustomEvent<"corpus" | "help">).detail;
      if (m !== "corpus" && m !== "help") return;
      setMode(m);
      setMessages([]);
      setOpen(true);
    }
    window.addEventListener("vantage:iris-mode", onModeRequest);
    return () => window.removeEventListener("vantage:iris-mode", onModeRequest);
  }, []);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    // Optimistic assistant placeholder we'll fill as the stream arrives.
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/regwatch/iris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          scopedItemId: effectiveScopedId,
          mode,
        }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sources: CitationSource[] | undefined;
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice("data: ".length);
            if (!json) continue;
            try {
              const ev = JSON.parse(json);
              if (ev.type === "sources") {
                sources = ev.sources;
              } else if (ev.type === "delta") {
                assistantText += ev.text;
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: assistantText,
                    sources,
                  };
                  return copy;
                });
              } else if (ev.type === "error") {
                setError(ev.message ?? t("irisError"));
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
      // Final commit so sources are attached even if no delta after them.
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: assistantText,
          sources,
        };
        return copy;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? t("irisClose") : t("irisOpen")}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-violet text-white shadow-lg shadow-brand-violet/40 transition-transform hover:scale-105"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 0 1-4-.8L3 21l1.8-4.5A8 8 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("irisChatbot")}
          className="fixed bottom-20 right-3 z-50 flex h-[600px] max-h-[calc(100dvh-100px)] w-[400px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-card-border bg-background shadow-2xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/60 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand-violet">
                Iris
              </p>
              <p className="text-sm font-medium text-foreground">
                {mode === "help"
                  ? t("irisHeaderHelp")
                  : effectiveScopedId
                  ? t("irisHeaderScoped")
                  : t("irisHeaderCorpus")}
              </p>
              {headerLabel && effectiveScopedId && mode === "corpus" && (
                <p className="font-mono text-[10px] text-muted">{headerLabel}</p>
              )}
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-muted underline hover:text-foreground"
              >
                {t("reset")}
              </button>
            )}
          </header>

          {/* Mode tabs — Corpus ↔ Help. Hidden on the regulation-scoped
              widget instance to keep the focused mode clean. */}
          {!effectiveScopedId && (
            <div className="flex items-center gap-1 border-b border-card-border bg-background/60 px-2">
              <ModeTab
                active={mode === "corpus"}
                onClick={() => {
                  if (mode !== "corpus") {
                    setMode("corpus");
                    setMessages([]);
                  }
                }}
                label={t("tabCorpus")}
              />
              <ModeTab
                active={mode === "help"}
                onClick={() => {
                  if (mode !== "help") {
                    setMode("help");
                    setMessages([]);
                  }
                }}
                label={t("tabHelp")}
              />
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && mode === "corpus" && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  {t("irisIntroCorpus", { model: "Claude Haiku" })}
                </p>
                <div className="grid gap-1.5">
                  <SuggestionButton
                    text={t("irisSuggestCorpus1")}
                    onPick={(s) => setInput(s)}
                  />
                  <SuggestionButton
                    text={t("irisSuggestCorpus2")}
                    onPick={(s) => setInput(s)}
                  />
                  <SuggestionButton
                    text={t("irisSuggestCorpus3")}
                    onPick={(s) => setInput(s)}
                  />
                </div>
              </div>
            )}
            {messages.length === 0 && mode === "help" && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  {t("irisIntroHelp")}
                </p>
                <div className="grid gap-1.5">
                  <SuggestionButton
                    text={t("irisSuggestHelp1")}
                    onPick={(s) => setInput(s)}
                  />
                  <SuggestionButton
                    text={t("irisSuggestHelp2")}
                    onPick={(s) => setInput(s)}
                  />
                  <SuggestionButton
                    text={t("irisSuggestHelp3")}
                    onPick={(s) => setInput(s)}
                  />
                  <SuggestionButton
                    text={t("irisSuggestHelp4")}
                    onPick={(s) => setInput(s)}
                  />
                </div>
              </div>
            )}
            {messages.map((m, idx) => (
              <Bubble key={idx} message={m} />
            ))}
            {pending && messages.length > 0 && (
              <p className="text-[11px] text-muted">{t("irisThinking")}</p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-card-border bg-card-bg/40 p-3"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  effectiveScopedId
                    ? t("irisPlaceholderScoped")
                    : t("irisPlaceholder")
                }
                className="flex-1 rounded-md border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
                disabled={pending}
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="rounded-md bg-brand-violet px-3 py-2 text-sm font-medium text-white hover:bg-brand-violet/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "…" : t("send")}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted">
              {t("irisDisclaimer")}
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-[11px] font-medium transition ${
        active
          ? "border-brand-violet text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SuggestionButton({
  text,
  onPick,
}: {
  text: string;
  onPick: (t: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="rounded-md border border-card-border bg-card-bg p-2 text-start text-[11px] text-foreground hover:border-brand-teal"
    >
      {text}
    </button>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-blue/15 text-foreground"
            : "bg-card-bg text-foreground/90"
        }`}
      >
        <RenderCitations text={message.content} sources={message.sources ?? []} />
        {!isUser && message.sources && message.sources.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-card-border pt-2 text-[10px] text-muted">
            {message.sources.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={`/regwatch/r/${s.jurisdiction_code.toLowerCase()}/${s.slug}`}
                  className="font-mono text-brand-teal hover:underline"
                >
                  [{i + 1}]
                </Link>{" "}
                {s.regulator} · {s.citation}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RenderCitations({
  text,
  sources,
}: {
  text: string;
  sources: CitationSource[];
}) {
  if (!text) return null;
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((p, idx) => {
        const m = p.match(/^\[(\d+)\]$/);
        if (!m) return <span key={idx}>{p}</span>;
        const n = parseInt(m[1], 10);
        const src = sources[n - 1];
        if (!src) return <span key={idx}>{p}</span>;
        return (
          <Link
            key={idx}
            href={`/regwatch/r/${src.jurisdiction_code.toLowerCase()}/${src.slug}`}
            title={`${src.regulator} — ${src.title}`}
            className="inline-flex items-baseline rounded bg-brand-teal/15 px-1 py-0 font-mono text-[11px] font-semibold text-brand-teal no-underline hover:bg-brand-teal/30"
          >
            [{n}]
          </Link>
        );
      })}
    </p>
  );
}
