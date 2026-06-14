import { useTranslations } from "next-intl";
import { SITE } from "@/lib/constants";

export function AboutAuthor({ authorName }: { authorName: string }) {
  const t = useTranslations("insightsUi");
  return (
    <aside className="mt-16 rounded-xl bg-brand-blue/5 border-s-4 border-brand-blue/40 p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand-blue mb-3">
        {t("aboutAuthorHeading")}
      </p>
      <p className="text-sm leading-relaxed text-foreground/85">
        {t.rich("authorBio", {
          name: authorName,
          siteName: SITE.name,
          location: SITE.locations.primary,
          strong: (chunks) => (
            <strong className="text-foreground">{chunks}</strong>
          ),
        })}
      </p>
      <p className="text-sm leading-relaxed text-foreground/75 mt-3">
        {t.rich("authorCta", {
          siteName: SITE.name,
          link: (chunks) => (
            <a href="/book" className="text-brand-blue hover:underline font-semibold">
              {chunks}
            </a>
          ),
        })}
      </p>
    </aside>
  );
}
