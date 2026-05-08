import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import {
  JsonLd,
  organizationSchema,
  localBusinessSchema,
  webSiteSchema,
} from "@/lib/seo/json-ld";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://intelle.io"),
  title: {
    default: "Engineering Intelligence & Research Services for GCC + India | intelle.io",
    template: "%s | intelle.io",
  },
  description:
    "Senior practitioner-led engineering intelligence for NOCs, EPCs, and industrial scale-ups across GCC + India. 30-50% of Tier-1 cost. Bespoke research, real outcomes.",
  keywords: [
    "engineering intelligence services",
    "engineering research GCC",
    "NOC consulting alternative",
    "industrial AI consultancy Dubai",
    "mid-tier EPC research partner",
    "bespoke engineering research",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "en-AE": "https://intelle.io",
      "en-SA": "https://intelle.io",
      "en-IN": "https://intelle.io",
      "en-x-default": "https://intelle.io",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://intelle.io",
    siteName: "intelle.io",
    title: "Engineering Intelligence & Research Services for GCC + India | intelle.io",
    description:
      "Senior practitioner-led engineering intelligence for NOCs, EPCs, and industrial scale-ups across GCC + India. 30-50% of Tier-1 cost.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "intelle.io — Engineering Intelligence That Drives Real Outcomes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Engineering Intelligence & Research Services for GCC + India",
    description: "Senior practitioner-led engineering research. 30-50% of Tier-1 cost.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "theme-color": "#0B1020",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={localBusinessSchema()} />
        <JsonLd data={webSiteSchema()} />
        <GoogleAnalytics />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
