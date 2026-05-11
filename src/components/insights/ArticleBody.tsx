import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PullQuote } from "./PullQuote";
import {
  DiagramRouter,
  DiagramErrorPlaceholder,
  parseDiagramSpec,
} from "./diagrams/DiagramRouter";

function isExternal(href: string | undefined): boolean {
  if (!href) return false;
  return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:");
}

const markdownComponents = {
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <PullQuote>{children}</PullQuote>
  ),
  // External links open in a new tab; internal (/research/..., /book, etc.)
  // navigate in the same tab as expected.
  a: (props: { href?: string; children?: React.ReactNode }) => {
    const { href, children } = props;
    if (isExternal(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return <a href={href}>{children}</a>;
  },
  // ReactMarkdown's `code` renderer covers both inline and fenced-block code.
  // We intercept fenced blocks whose language is `diagram-<type>` and render
  // the matching diagram component instead of a code element.
  code: (props: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const { inline, className, children } = props;
    if (inline || !className) {
      return <code className={className}>{children}</code>;
    }
    const lang = className.replace(/^language-/, "");
    if (/^diagram-/.test(lang)) {
      const body = String(children ?? "").trim();
      const spec = parseDiagramSpec(lang, body);
      if (!spec) {
        return <DiagramErrorPlaceholder language={lang} error="Invalid JSON spec" />;
      }
      return <DiagramRouter spec={spec} />;
    }
    return <code className={className}>{children}</code>;
  },
  // Hide the ``` wrapper that react-markdown puts around code blocks — the
  // diagram fenced block would otherwise be inside a <pre>.
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
