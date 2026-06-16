import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Bundle the Outreach .md prompt files into serverless functions that read
  // them at runtime (src/lib/outreach/prompts/index.ts).
  outputFileTracingIncludes: {
    "/api/**": ["./src/lib/outreach/prompts/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/engineering/knowledge-management",
        destination: "/engineering/knowledge-management-implementation",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            // F6: baseline CSP — the safe, non-breaking directives. These have
            // no restrictive default that would block Next's inline scripts/
            // styles or the Stripe/Cal/GA integrations: clickjacking
            // (frame-ancestors), <base> injection (base-uri), plugin objects
            // (object-src), and form-action hijack. A full nonce-based
            // default-src/script-src policy is the recommended follow-up
            // (requires per-request nonce wiring in middleware).
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // microphone=(self) enables in-field voice capture for the
            // evidence human-evaluation recorder; camera/geolocation stay off.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
