import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { JsonLd, organizationSchema } from "@/lib/seo/json-ld";
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
    default: "intelle.io | Bespoke Research. Real Outcomes.",
    template: "%s | intelle.io",
  },
  description:
    "Engineering intelligence and research services spanning energy, standards, AI, technology scouting, market intelligence, and patent analytics. A SparkLab LLC brand.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://intelle.io",
    siteName: "intelle.io",
    title: "intelle.io | Bespoke Research. Real Outcomes.",
    description:
      "Bespoke intelligence. Domain expertise. Real outcomes. Engineering intelligence and research services across energy, engineering, AI & digital.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "intelle.io - Bespoke Research. Real Outcomes.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "intelle.io | Bespoke Research. Real Outcomes.",
    description:
      "Bespoke intelligence. Domain expertise. Real outcomes.",
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
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
