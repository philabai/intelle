import type { Metadata } from "next";
import Link from "next/link";
import { CalEmbed } from "@/components/scheduling/CalEmbed";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Book a Call",
  description:
    "Schedule a free 30-minute intro call to scope a research or implementation engagement. Zoom link auto-attached.",
};

export default function BookPage() {
  const calLink = `${SITE.calcom.username}/${SITE.calcom.introCallSlug}`;

  return (
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

        <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden h-[760px]">
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
      </div>
    </section>
  );
}
