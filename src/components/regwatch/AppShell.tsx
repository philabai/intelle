import { RegwatchNav } from "./Nav";

/**
 * Shell wrapping every /regwatch/* surface. The main intelle.io SiteNav is
 * deliberately NOT rendered here — RegWatch surfaces feel like a focused
 * sub-app with their own four-affordance nav. The header keeps an
 * "← intelle.io" link so users can navigate back to the marketing site.
 */
export function RegwatchAppShell({
  authed,
  children,
}: {
  authed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <RegwatchNav authed={authed} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-card-border bg-card-bg/40 py-6 text-center text-xs text-muted">
        intelle.io RegWatch — pull-model regulatory monitoring · SparkLab LLC · Dubai
      </footer>
    </div>
  );
}

export function RegwatchComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
        Coming soon
      </span>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="max-w-2xl text-muted">{description}</p>}
    </div>
  );
}
