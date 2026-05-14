"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

const HINT_SESSION_KEY = "iris-hint-dismissed";
const HINT_AUTO_DISMISS_MS = 10_000;
const HINT_INITIAL_DELAY_MS = 1500;

type AssistantBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

type ToolResultRecord = {
  id: string;
  result: string;
  isError?: boolean;
};

/**
 * UI state mirrors Anthropic's message structure 1:1:
 *   user           → { role: "user", content: string }
 *   tool_result    → { role: "user", content: [tool_result blocks] }   (invisible to viewer)
 *   assistant turn → { role: "assistant", content: [text|tool_use blocks] }
 *
 * Modelling tool_result as its own message (rather than mixing it into the
 * assistant turn) means toApiMessages is a direct mapping and there's no
 * "pending" reconstruction needed when serialising history for the next call.
 */
type ChatMessage =
  | { role: "user"; text: string }
  | { role: "tool_result"; results: ToolResultRecord[] }
  | { role: "assistant"; blocks: AssistantBlock[] };

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; id: string; result: string; is_error?: boolean }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

const QUICK_ACTIONS = [
  "What does intelle.io do?",
  "Book a call with the Senior Practitioner",
  "Tell me about your KM services",
];

const GREETING_TEXT =
  "Hi — I'm Iris, the intelle.io concierge. I can answer questions about our research and implementation services, point you to the right page, or set up a 30-minute call with our Senior Practitioner. What would you like to do?";

const GREETING: ChatMessage = {
  role: "assistant",
  blocks: [{ type: "text", text: GREETING_TEXT }],
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

/** Transform UI history into Anthropic-format messages for the API.
 *  The UI-only greeting (a synthetic assistant turn injected at start) is
 *  excluded — Anthropic requires conversations to start with a user message. */
function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  // Drop the leading greeting; it's a UI nicety, not part of the conversation.
  const start =
    messages[0]?.role === "assistant" &&
    messages[0].blocks.length === 1 &&
    messages[0].blocks[0].type === "text" &&
    messages[0].blocks[0].text === GREETING_TEXT
      ? 1
      : 0;

  return messages.slice(start).map((m): ApiMessage => {
    if (m.role === "user") {
      return { role: "user", content: m.text };
    }
    if (m.role === "tool_result") {
      return {
        role: "user",
        content: m.results.map((r) => ({
          type: "tool_result",
          tool_use_id: r.id,
          content: r.result,
          ...(r.isError ? { is_error: true } : {}),
        })),
      };
    }
    return {
      role: "assistant",
      content: m.blocks.map((b) => {
        if (b.type === "text") return { type: "text", text: b.text };
        return { type: "tool_use", id: b.id, name: b.name, input: b.input };
      }),
    };
  });
}

export function IrisWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to the latest message — fires on new messages, streaming start, AND
  // on panel reopen. useLayoutEffect runs before paint so there's no visible
  // flash of the top of the conversation when the panel mounts.
  useLayoutEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // First-load hint: show once per browser session, after a short delay,
  // unless the user has already dismissed it or opened the chat.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(HINT_SESSION_KEY) === "1") return;
    const t = setTimeout(() => setHintOpen(true), HINT_INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss the hint after a few seconds so it doesn't linger.
  useEffect(() => {
    if (!hintOpen) return;
    const t = setTimeout(() => dismissHint(), HINT_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [hintOpen]);

  function dismissHint() {
    setHintOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(HINT_SESSION_KEY, "1");
    }
  }

  function openChat() {
    setIsOpen(true);
    dismissHint();
  }

  async function send(userText: string) {
    if (!userText.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", text: userText.trim() };
    const nextHistory: ChatMessage[] = [...messages, userMessage];

    setMessages(nextHistory);
    setInput("");
    setIsStreaming(true);

    // Build outbound payload — UI state already mirrors API structure 1:1.
    const apiMessages = toApiMessages(nextHistory);

    // Reserve an empty assistant message that we'll fill in as the stream lands.
    setMessages((prev) => [...prev, { role: "assistant", blocks: [] }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Chat failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const chunk of lines) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(json) as StreamEvent;
          } catch {
            continue;
          }
          applyEvent(event);
        }
      }
    } catch (err) {
      console.error("[iris widget]", err);
      applyEvent({
        type: "text",
        text:
          "\n\n_Sorry — I hit a snag. Try again, or email hello@intelle.io._",
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function applyEvent(event: StreamEvent) {
    setMessages((prev) => {
      const next = [...prev];

      if (event.type === "text" || event.type === "tool_use" || event.type === "error") {
        // These all extend the LAST assistant message.
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") {
          // Defensive: spawn a fresh assistant message if the last isn't one.
          next.push({ role: "assistant", blocks: [] });
        }
        const idx = next.length - 1;
        const target = next[idx] as { role: "assistant"; blocks: AssistantBlock[] };
        const blocks = [...target.blocks];

        if (event.type === "text") {
          const tail = blocks[blocks.length - 1];
          if (tail && tail.type === "text") {
            blocks[blocks.length - 1] = { ...tail, text: tail.text + event.text };
          } else {
            blocks.push({ type: "text", text: event.text });
          }
        } else if (event.type === "tool_use") {
          blocks.push({
            type: "tool_use",
            id: event.id,
            name: event.name,
            input: event.input,
          });
        } else {
          // error
          blocks.push({
            type: "text",
            text: `\n\n_Error: ${event.message}_`,
          });
        }

        next[idx] = { role: "assistant", blocks };
        return next;
      }

      if (event.type === "tool_result") {
        // Tool result is a turn boundary — it goes in a user-role tool_result
        // message between the assistant turn that called the tool and any
        // continuation text the bot streams afterwards. Reuse the trailing
        // tool_result message if one is already open, otherwise create a new
        // one AND start a fresh empty assistant message for continuation text.
        const last = next[next.length - 1];
        if (last && last.role === "tool_result") {
          // Append to the existing trailing tool_result message
          next[next.length - 1] = {
            role: "tool_result",
            results: [
              ...last.results,
              { id: event.id, result: event.result, isError: event.is_error },
            ],
          };
          return next;
        }
        // Insert a new tool_result message, then a fresh empty assistant
        // message so subsequent text/tool_use events land in a new turn.
        next.push({
          role: "tool_result",
          results: [{ id: event.id, result: event.result, isError: event.is_error }],
        });
        next.push({ role: "assistant", blocks: [] });
        return next;
      }

      return prev;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const showQuickActions =
    messages.length === 1 && messages[0].role === "assistant" && !isStreaming;

  return (
    <>
      {/* First-load hint card — appears once per session above the bubble */}
      {!isOpen && hintOpen && (
        <div
          className="fixed bottom-24 right-6 z-40 max-w-[260px] sm:bottom-28 sm:right-8"
          role="status"
        >
          <div className="relative rounded-2xl rounded-br-sm bg-gradient-to-br from-brand-teal to-brand-blue p-4 pr-9 text-white shadow-xl shadow-brand-teal/30">
            <button
              onClick={dismissHint}
              aria-label="Dismiss"
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md text-white/80 hover:bg-white/15 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-sm font-semibold leading-tight">
              Hi! I&apos;m Iris.
            </p>
            <p className="mt-1 text-xs text-white/90 leading-snug">
              Ask me about intelle.io services, or I can set up a call with our Senior Practitioner.
            </p>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={openChat}
          aria-label="Open chat with Iris"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-blue text-white shadow-lg shadow-brand-teal/30 transition-transform hover:scale-105 sm:bottom-8 sm:right-8"
        >
          {hintOpen && (
            <span
              className="absolute inset-0 rounded-full bg-brand-teal opacity-60 animate-ping"
              aria-hidden
            />
          )}
          <svg
            className="relative h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.84L3 20l1.34-3.86A8.94 8.94 0 013 12C3 7.582 7.03 4 12 4s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:bottom-8 sm:right-8 sm:left-auto sm:top-auto sm:inset-auto"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden border border-card-border bg-background shadow-2xl sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-card-border bg-gradient-to-r from-brand-teal/15 via-card-bg to-brand-violet/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-blue text-white">
                  <span className="text-sm font-bold">I</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-heading leading-tight">
                    Iris
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    intelle.io concierge · AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="rounded-md p-3 -mr-1 text-muted hover:text-heading hover:bg-card-bg"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {messages.map((m, i) => (
                <MessageRow key={i} message={m} onClose={() => setIsOpen(false)} />
              ))}
              {(() => {
                const last = messages[messages.length - 1];
                const showDots =
                  isStreaming &&
                  last?.role === "assistant" &&
                  last.blocks.length === 0;
                return showDots ? (
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-teal [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-teal [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-teal" />
                  </div>
                ) : null;
              })()}

              {showQuickActions && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {QUICK_ACTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1.5 text-xs text-brand-teal hover:bg-brand-teal/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-card-border bg-card-bg/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Iris a question…"
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-heading placeholder:text-muted/60 focus:border-brand-teal focus:outline-none disabled:opacity-50 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-brand-navy transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted/60 text-center">
                Iris is an AI — sometimes wrong. For anything binding, please{" "}
                <Link
                  href="/book"
                  className="underline hover:text-brand-teal"
                  onClick={() => setIsOpen(false)}
                >
                  book a call
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MessageRow({
  message,
  onClose,
}: {
  message: ChatMessage;
  onClose: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-blue/15 px-3 py-2 text-sm text-heading">
          {message.text}
        </div>
      </div>
    );
  }

  // tool_result messages exist only for API-history continuity — invisible to the viewer
  if (message.role === "tool_result") {
    return null;
  }

  return (
    <div className="space-y-2">
      {message.blocks.map((block: AssistantBlock, i: number) => {
        if (block.type === "text") {
          return (
            <div key={i} className="max-w-[90%]">
              <div className="rounded-2xl rounded-tl-sm bg-card-bg border border-card-border px-3 py-2 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {block.text}
              </div>
            </div>
          );
        }
        if (block.type === "tool_use") {
          if (block.name === "navigate_to_page") {
            const href = String(block.input.href ?? "/");
            const label = String(block.input.label ?? "Open page");
            const reason = String(block.input.reason ?? "");
            return (
              <div key={i} className="max-w-[90%]">
                <Link
                  href={href}
                  onClick={onClose}
                  className="block rounded-xl border border-brand-violet/40 bg-brand-violet/10 px-4 py-3 hover:bg-brand-violet/20 transition-colors"
                >
                  <p className="text-sm font-semibold text-brand-violet flex items-center gap-1.5">
                    {label}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </p>
                  {reason && (
                    <p className="mt-1 text-xs text-muted leading-snug">
                      {reason}
                    </p>
                  )}
                </Link>
              </div>
            );
          }
          if (block.name === "book_meeting") {
            return (
              <div key={i} className="max-w-[90%]">
                <Link
                  href="/book"
                  onClick={onClose}
                  className="block rounded-xl border border-brand-teal/40 bg-gradient-to-br from-brand-teal/15 to-brand-blue/10 px-4 py-3 hover:from-brand-teal/25 transition-colors"
                >
                  <p className="text-sm font-semibold text-brand-teal flex items-center gap-1.5">
                    Book a 30-min discovery call
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </p>
                  <p className="mt-1 text-xs text-muted leading-snug">
                    Free · 30 minutes · led by our Senior Practitioner personally
                  </p>
                </Link>
              </div>
            );
          }
          // capture_email and any other tool_use are invisible — server runs them.
          return null;
        }
        return null;
      })}
    </div>
  );
}
