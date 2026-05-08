import { SITE } from "@/lib/constants";

export function AboutAuthor({ authorName }: { authorName: string }) {
  return (
    <aside className="mt-16 rounded-xl bg-brand-blue/5 border-l-4 border-brand-blue/40 p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand-blue mb-3">
        ABOUT THE AUTHOR
      </p>
      <p className="text-sm leading-relaxed text-foreground/85">
        <strong className="text-foreground">{authorName}</strong> is the Founder &amp; CEO of {SITE.name},
        an engineering intelligence and research-services practice based in {SITE.locations.primary}.
        25+ years across S&amp;P Global, IHS Markit, GE Energy, Accuris (a KKR portfolio company),
        and Sapient Consulting. SAE-published on industrial AI and cognitive operations.
        CERAWeek-invited speaker. Fortune 500 reference engagements with Aramco, ADNOC, Shell,
        Chevron, Honeywell, Baker Hughes, and GE Energy.
      </p>
      <p className="text-sm leading-relaxed text-foreground/75 mt-3">
        {SITE.name} runs scoped research and implementation engagements.
        If you are weighing a decision this quarter,{" "}
        <a href="/book" className="text-brand-blue hover:underline font-semibold">
          book a discovery call
        </a>
        .
      </p>
    </aside>
  );
}
