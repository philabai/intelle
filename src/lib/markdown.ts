import { marked } from "marked";
import TurndownService from "turndown";

// Configure marked: GitHub-flavoured markdown is the closest match to what
// Claude produces (and what react-markdown renders on the public page).
marked.setOptions({
  gfm: true,
  breaks: false,
});

export function markdownToHtml(md: string): string {
  // marked.parse can be sync or async depending on options; we keep it sync.
  return marked.parse(md, { async: false }) as string;
}

const turndown = new TurndownService({
  headingStyle: "atx",          // # / ## / ### — same as our markdown convention
  codeBlockStyle: "fenced",     // ``` ... ``` (preserves the diagram fenced blocks)
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

// Preserve our diagram fenced code blocks: marked converts them to <pre><code class="language-diagram-...">,
// turndown's default code-block rule already keeps the language tag, but we make sure raw HTML inside
// is escaped properly.
turndown.keep(["figure"]);

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}
