import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { TutorialPlayer } from "@/components/regwatch/tutorials/TutorialPlayer";
import {
  TUTORIAL_COURSES,
  courseDurationLabel,
} from "@/lib/regwatch/tutorials";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return {
    title: t("tutorials.title"),
    description: t("tutorials.description"),
  };
}
export const dynamic = "force-dynamic";

export default async function TutorialsPage() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("tutorialsEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("tutorialsHeading")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {t.rich("tutorialsSubheading", {
              continue: (chunks) => (
                <span className="text-foreground">{chunks}</span>
              ),
            })}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {TUTORIAL_COURSES.map((course, i) => (
          <section key={course.slug}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {i + 1}. {course.title}
              </h2>
              <span className="shrink-0 text-[11px] text-muted">
                {course.sections.length > 0
                  ? t("tutorialSectionsDuration", {
                      count: course.sections.length,
                      duration: courseDurationLabel(course),
                    })
                  : t("comingSoon")}
              </span>
            </div>
            <p className="mb-4 max-w-2xl text-sm text-muted">
              {course.description}
            </p>
            <TutorialPlayer course={course} />
          </section>
        ))}
      </div>
    </RegwatchAppShell>
  );
}
