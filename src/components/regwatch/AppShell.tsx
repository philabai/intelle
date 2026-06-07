import { RegwatchNav } from "./Nav";
import { RegwatchChatWidget } from "./chat/RegwatchChatWidget";

/**
 * Shell wrapping every /regwatch/* surface. The main intelle.io SiteNav is
 * deliberately NOT rendered here — Vantage surfaces feel like a focused
 * sub-app with their own four-affordance nav. The header keeps an
 * "← intelle.io" link so users can navigate back to the marketing site.
 *
 * The Iris chat widget is mounted at the shell level so it floats over every
 * /regwatch/* page (anon + authed). Pages that need to scope it to a single
 * regulation render their own <RegwatchChatWidget scopedItemId=... /> in
 * place of the global one — see /regwatch/r/[j]/[s]/page.tsx for an example.
 */
export function RegwatchAppShell({
  authed,
  children,
  /** When set, the floating Iris chat is omitted (the page provides its own scoped one). */
  suppressChatWidget,
}: {
  authed: boolean;
  children: React.ReactNode;
  suppressChatWidget?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <RegwatchNav authed={authed} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-card-border bg-card-bg/40 py-6 text-center text-xs text-muted">
        Vantage by intelle.io — pull-model regulatory monitoring · SparkLab LLC · Dubai
      </footer>
      {!suppressChatWidget && <RegwatchChatWidget />}
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
