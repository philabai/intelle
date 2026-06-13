import type { MetadataRoute } from "next";

/**
 * Robots rules. Default `*` allows everything except admin / api / auth.
 * AI crawlers are listed explicitly so audit tools confirm they are
 * permitted to index for AEO (answer-engine optimisation).
 */
export default function robots(): MetadataRoute.Robots {
  // Cover both legacy un-prefixed and locale-prefixed (/en/, /fr/, /ar/) paths.
  const protectedPaths = ["admin", "auth", "dashboard"];
  const disallow = [
    "/api/",
    ...protectedPaths.flatMap((p) => [`/${p}/`, `/*/${p}/`]),
  ];
  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "anthropic-ai",
    "Google-Extended",
    "PerplexityBot",
    "Applebot-Extended",
    "CCBot",
    "Amazonbot",
    "Bytespider",
    "FacebookBot",
    "DuckDuckBot",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: "/",
        disallow,
      })),
    ],
    sitemap: "https://intelle.io/sitemap.xml",
    host: "https://intelle.io",
  };
}
