import type { ServiceCategory } from "@/lib/types";

type Spotlight = NonNullable<ServiceCategory["platformSpotlight"]>;

export function PlatformSpotlight({ spotlight }: { spotlight: Spotlight }) {
  return (
    <div className="rounded-2xl border border-brand-teal/30 bg-gradient-to-br from-brand-teal/10 via-card-bg to-brand-blue/10 p-6 sm:p-10 mb-10">
      {/* Header */}
      <p className="text-xs font-bold uppercase tracking-wider text-brand-teal mb-3">
        {spotlight.eyebrow}
      </p>
      <h3 className="text-2xl sm:text-3xl font-bold text-heading mb-3">
        {spotlight.title}
      </h3>
      <p className="text-base sm:text-lg text-foreground/90 mb-5">
        {spotlight.subtitle}
      </p>
      <p className="text-muted leading-relaxed max-w-4xl">
        {spotlight.positioningStatement}
      </p>

      {/* Quantified benefits row */}
      {spotlight.benefits.length > 0 && (
        <div className="mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {spotlight.benefits.map((b) => (
              <div
                key={b.label}
                className="rounded-xl border border-card-border bg-brand-navy/40 p-3 sm:p-4 text-center flex flex-col justify-center"
              >
                <div className="text-xl sm:text-2xl font-bold text-brand-teal leading-tight">
                  {b.metric}
                </div>
                <div className="text-[11px] sm:text-xs text-muted mt-1 leading-snug">
                  {b.label}
                </div>
              </div>
            ))}
          </div>
          {spotlight.benefitsSource && (
            <p className="text-[11px] text-muted/70 mt-3 italic">
              {spotlight.benefitsSource}
            </p>
          )}
        </div>
      )}

      {/* Capabilities grid */}
      {spotlight.capabilities.length > 0 && (
        <div className="mt-10">
          <h4 className="text-sm font-bold uppercase tracking-wider text-heading mb-4">
            What it does
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spotlight.capabilities.map((cap) => (
              <div
                key={cap.title}
                className="rounded-xl border border-card-border bg-card-bg/60 p-5"
              >
                <h5 className="text-base font-semibold text-heading mb-2">
                  {cap.title}
                </h5>
                <p className="text-sm text-muted leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional addon sub-section (e.g., GenAI Layer on KM, Integration Layer on
          Requirements Digitalization). Badge label is per-service. */}
      {spotlight.addon && (
        <div className="mt-10 pt-8 border-t border-brand-teal/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 px-2 items-center justify-center rounded-full bg-brand-blue/20 text-brand-blue text-[10px] font-bold uppercase tracking-wider">
              {spotlight.addon.badge ?? "Add-on"}
            </span>
          </div>
          <h4 className="text-xl sm:text-2xl font-bold text-heading mb-2">
            {spotlight.addon.title}
          </h4>
          <p className="text-foreground/90 mb-5">{spotlight.addon.subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spotlight.addon.capabilities.map((cap) => (
              <div
                key={cap.title}
                className="rounded-xl border border-card-border bg-card-bg/60 p-5"
              >
                <h5 className="text-base font-semibold text-heading mb-2">
                  {cap.title}
                </h5>
                <p className="text-sm text-muted leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing note — "why it wins on engineering content" */}
      {spotlight.closingNote && (
        <div className="mt-8 pt-6 border-t border-brand-teal/20">
          <p className="text-sm text-foreground/90 italic leading-relaxed">
            {spotlight.closingNote}
          </p>
        </div>
      )}
    </div>
  );
}
