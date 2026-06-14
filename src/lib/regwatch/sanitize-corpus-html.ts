import sanitizeHtml from "sanitize-html";

/**
 * Sanitize regulation `body_html` before rendering it via
 * dangerouslySetInnerHTML. The HTML is scraped from external regulator sources
 * (eCFR, EUR-Lex, SASO, GOV.UK, …) and rendered into authenticated pages, so it
 * is untrusted: a source containing <script>, event handlers, or javascript:
 * URLs would otherwise yield stored XSS in the viewer.
 */
export function sanitizeCorpusHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "div", "span",
      "ul", "ol", "li", "dl", "dt", "dd",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      "a", "strong", "b", "em", "i", "u", "sub", "sup", "small",
      "blockquote", "pre", "code", "figure", "figcaption", "section", "article",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      "*": ["id"],
    },
    // Only safe URL schemes; drops javascript:/data: etc.
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Force external links to be safe.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }, true),
    },
  });
}
