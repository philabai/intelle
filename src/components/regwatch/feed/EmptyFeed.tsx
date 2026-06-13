import { Link } from "@/i18n/navigation";

interface Props {
  hasFootprint: boolean;
}

/**
 * Three distinct empty states per A.3:
 *  1. No footprint configured → onboarding prompt
 *  2. Footprint configured but matcher hasn't run yet → wait + manual trigger
 *  3. Footprint configured + matcher ran but no items cleared the threshold
 *     → broaden the footprint
 */
export function EmptyFeed({ hasFootprint }: Props) {
  if (!hasFootprint) {
    return (
      <div className="rounded-xl border border-dashed border-card-border bg-card-bg/40 p-8 text-center">
        <h2 className="text-lg font-medium text-foreground">
          Set up your footprint to see what matters to you.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          The Relevance Feed scores every regulation in the corpus against your
          operations footprint — the jurisdictions, activities, regulators, and
          topics you actually care about.
        </p>
        <Link
          href="/regwatch/settings/footprint"
          className="mt-5 inline-block rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
        >
          Configure your footprint →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-card-border bg-card-bg/40 p-8 text-center">
      <h2 className="text-lg font-medium text-foreground">
        You&apos;re all caught up.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        No regulations match your footprint at the current threshold. This can
        mean: (a) the matcher hasn&apos;t run since your last footprint change
        — give it a minute, (b) your footprint is narrow — broaden it on the
        settings page, or (c) the corpus genuinely has nothing relevant to you
        right now.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/regwatch/settings/footprint"
          className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
        >
          Edit footprint
        </Link>
        <Link
          href="/regwatch/browse"
          className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
        >
          Browse the corpus
        </Link>
      </div>
    </div>
  );
}
