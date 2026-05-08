import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact intelle.io | Engineering Research Inquiries, Dubai UAE",
  description:
    "Reach out to intelle.io for bespoke engineering research, AI scoping, standards advisory, or M&A diligence. Dubai-based. UAE/GCC/India coverage. Reply within 1 business day.",
  keywords: [
    "engineering consultant Dubai UAE",
    "NOC research partner contact",
    "industrial AI advisor contact",
    "engineering research inquiries",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact intelle.io",
    description:
      "Bespoke engineering research, AI scoping, standards advisory, M&A diligence. Dubai-based.",
    url: "/contact",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Contact intelle.io" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
