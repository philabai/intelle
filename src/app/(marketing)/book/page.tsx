import type { Metadata } from "next";
import Link from "next/link";
import { CalEmbed } from "@/components/scheduling/CalEmbed";
import { SITE } from "@/lib/constants";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema } from "@/lib/seo/json-ld";
import type { FAQ } from "@/lib/types";

const BOOK_FAQS: FAQ[] = [
  {
    q: "Is the discovery call free?",
    a: "Yes. The 30-minute discovery call is free and no-obligation. We use it to understand your decision and scope, and to confirm whether we are the right fit. If we are, you receive a written SOW within 48 hours.",
  },
  {
    q: "Do I need to prepare anything beforehand?",
    a: "No mandatory prep. If you can describe the decision you're trying to make in 1–2 sentences and the timeline you're working against, that's plenty. The call is for understanding scope, not interviewing you.",
  },
  {
    q: "What happens after the call if we want to move forward?",
    a: "Within 48 hours of the call we send a written Statement of Work (SOW): scope, deliverables, timeline, fixed fee. Most engagements start within 1–2 weeks of SOW signature.",
  },
  {
    q: "Will I be talking to a senior practitioner or an analyst?",
    a: "Senior practitioner. Every discovery call and engagement is led by Arnab Ghosh (Founder & CEO) — 25+ years across S&P Global, IHS Markit, GE Energy, Accuris (a KKR portfolio company), and Sapient Consulting. SAE-published. CERAWeek-invited.",
  },
  {
    q: "What if 30 minutes isn't enough?",
    a: "If the conversation needs more time we'll either extend the slot if the calendar allows, or schedule a follow-up. We don't watch the clock — but 30 minutes is usually plenty to determine fit and scope.",
  },
];

export const metadata: Metadata = {
  title: "Book a 30-Min Discovery Call | intelle.io Engineering Research",
  description:
    "Book a free 30-minute discovery call with intelle.io. Scope an engineering research, AI readiness, standards, or M&A diligence engagement. Zoom auto-attached. SOW within 48 hours.",
  keywords: [
    "engineering research discovery call",
    "free engineering consultation",
    "scope engineering research engagement",
    "AI readiness call",
    "intelle.io booking",
  ],
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book a 30-Minute Discovery Call",
    description:
      "Free 30-minute call to scope a research or implementation engagement. Zoom auto-attached.",
    url: "/book",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Book a 30-Minute Discovery Call" },
};

export default function BookPage() {
  const calLink = `${SITE.calcom.username}/${SITE.calcom.introCallSlug}`;

  return (
    <>
      <JsonLd data={faqSchema(BOOK_FAQS)} />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
              Book a free intro call
            </h1>
            <p className="text-muted">
              Pick a 30-minute slot that works for you. You&apos;ll get a Zoom link in your
              calendar invite, and we&apos;ll use the time to scope the right engagement
              for your needs.
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden h-[680px] sm:h-[760px]">
            <CalEmbed calLink={calLink} className="h-full w-full" />
          </div>

          <p className="text-sm text-muted/70 mt-4">
            Not ready to book?{" "}
            <Link href="/contact" className="text-brand-teal hover:underline">
              Send us a message
            </Link>{" "}
            or email{" "}
            <a href={`mailto:${SITE.email}`} className="text-brand-teal hover:underline">
              {SITE.email}
            </a>
            .
          </p>

          <div className="mt-12">
            <FAQSection faqs={BOOK_FAQS} title="Common questions about the call" />
          </div>
        </div>
      </section>
    </>
  );
}
