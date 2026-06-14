import type { Metadata } from "next";
import { Poppins, IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  JsonLd,
  organizationSchema,
  localBusinessSchema,
  webSiteSchema,
} from "@/lib/seo/json-ld";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { routing, localeDir } from "@/i18n/routing";
import "../globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Arabic-capable face — only its CSS variable is injected on the `ar` locale, so
// globals.css falls back to Poppins for en/fr (see `--font-arabic` there).
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_NAME = "intelle.io";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const titleDefault = t("root.title");
  const description = t("root.description");
  const ogLocale =
    locale === "fr" ? "fr_FR" : locale === "ar" ? "ar_AE" : "en_US";
  return {
    metadataBase: new URL("https://intelle.io"),
    title: { default: titleDefault, template: t("root.template") },
    description,
    keywords: [
      "engineering intelligence services",
      "engineering research GCC",
      "NOC consulting alternative",
      "industrial AI consultancy Dubai",
      "mid-tier EPC research partner",
      "bespoke engineering research",
    ],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        fr: "/fr",
        ar: "/ar",
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `https://intelle.io/${locale}`,
      siteName: SITE_NAME,
      title: titleDefault,
      description,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t("root.ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("root.twitterTitle"),
      description: t("root.twitterDescription"),
    },
    other: { "theme-color": "#0B1020" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Enables static rendering for this locale segment.
  setRequestLocale(locale);

  const dir = localeDir(locale);
  const fontVars = `${poppins.variable} ${locale === "ar" ? plexArabic.variable : ""}`;

  return (
    <html lang={locale} dir={dir} className={fontVars} suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={localBusinessSchema()} />
        <JsonLd data={webSiteSchema()} />
        <GoogleAnalytics />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
