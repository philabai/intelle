import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("contact.title"),
    description: t("contact.description"),
    keywords: [
      "engineering consultant Dubai UAE",
      "NOC research partner contact",
      "industrial AI advisor contact",
      "engineering research inquiries",
    ],
    alternates: { canonical: "/contact" },
    openGraph: {
      title: t("contact.ogTitle"),
      description: t("contact.ogDescription"),
      url: "/contact",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("contact.ogTitle"),
    },
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
