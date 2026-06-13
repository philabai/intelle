import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { TutorialPlayer } from "@/components/regwatch/tutorials/TutorialPlayer";
import {
  TUTORIAL_COURSES,
  courseDurationLabel,
} from "@/lib/regwatch/tutorials";

export const metadata: Metadata = {
  title: "Video tutorials — Vantage",
  description:
    "Interactive walkthroughs of Vantage by intelle.io — exploring regulations, monitoring your feed, managing compliance, and authoring documents.",
};
export const dynamic = "force-dynamic";

export default async function TutorialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Tutorials
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            See Vantage in action
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Four narrated, interactive walkthroughs — one per top menu. Each plays
            section by section with a voiceover and on-screen labels; click{" "}
            <span className="text-foreground">Continue</span> to move through each
            menu item at your own pace.
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
                  ? `${course.sections.length} sections · ${courseDurationLabel(course)}`
                  : "Coming soon"}
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
