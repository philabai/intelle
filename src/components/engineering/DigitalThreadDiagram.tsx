import { GradientText } from "@/components/ui/GradientText";

type SourceChip = { label: string; example?: string };

const SOURCE_CHIPS: SourceChip[] = [
  { label: "Industry standards", example: "API · ISO · NACE · ASME · IEC" },
  { label: "Mil specs & defence codes", example: "Mil-Spec · NATO · AIA" },
  { label: "Regulations", example: "Regulator + jurisdiction" },
  { label: "Internal standards & design guides", example: "Your engineering DNA" },
];

const DECOMP_CHIPS = [
  "Requirements",
  "Prohibitions",
  "Guidance",
  "Engineering information",
];

type Destination = {
  title: string;
  category: string;
  systems: string[];
  accent: {
    border: string;
    text: string;
    bg: string;
  };
};

const DESTINATIONS: Destination[] = [
  {
    title: "Requirements management",
    category: "RMS",
    systems: ["PTC Codebeamer", "IBM DOORS", "Jama Connect", "Siemens Polarion"],
    accent: {
      border: "border-brand-violet/40",
      text: "text-brand-violet",
      bg: "bg-brand-violet/10",
    },
  },
  {
    title: "Product lifecycle",
    category: "PLM",
    systems: ["PTC Windchill", "Siemens Teamcenter"],
    accent: {
      border: "border-brand-blue/40",
      text: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
  },
  {
    title: "Asset lifecycle",
    category: "ALM / EAM",
    systems: ["IBM Maximo", "Bentley AssetWise", "AVEVA APM"],
    accent: {
      border: "border-brand-teal/40",
      text: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  },
];

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
    </svg>
  );
}

export function DigitalThreadDiagram() {
  return (
    <section className="border-t border-card-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-teal mb-3">
            How a standard reaches every system that depends on it
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">
            The{" "}
            <GradientText variant="teal-blue">Digital Thread</GradientText>{" "}
            Architecture
          </h2>
          <p className="max-w-3xl mx-auto text-muted">
            Every design decision must trace back to a governing standard.
            Every revision cascades into inspections, procedures, change
            management, and supplier obligations. The thread is what makes that
            cascade automatic rather than manual.
          </p>
        </div>

        {/* Layer 1 — Sources */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            Layer 1 · Sources
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOURCE_CHIPS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                {s.example && (
                  <p className="text-[11px] text-muted mt-1">{s.example}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Down arrow to Layer 2 */}
        <div className="flex justify-center my-4" aria-hidden>
          <Arrow className="h-6 w-6 text-brand-teal/60" />
        </div>

        {/* Layer 2 — Decomposition engine (concept name only — no product brand) */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            Layer 2 · Decompose · Enrich · Extract · Compare
          </p>
          <div className="rounded-2xl border-2 border-brand-teal/40 bg-gradient-to-br from-brand-teal/15 via-card-bg to-brand-blue/15 p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold text-heading text-center mb-2">
              The digital-threading engine
            </h3>
            <p className="text-sm text-muted text-center max-w-2xl mx-auto mb-5">
              Unstructured standards become structured, citable, traceable
              requirement objects — each one enriched with metadata and
              addressable by an API.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DECOMP_CHIPS.map((c) => (
                <span
                  key={c}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/40"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Down arrow to Layer 3 */}
        <div className="flex flex-col items-center my-4" aria-hidden>
          <Arrow className="h-6 w-6 text-brand-blue/60" />
        </div>

        {/* Layer 3 — Destination engineering systems */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            Layer 3 · Your engineering toolchain
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DESTINATIONS.map((d) => (
              <div
                key={d.title}
                className={`rounded-xl border ${d.accent.border} ${d.accent.bg} p-5`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${d.accent.text} mb-1`}
                >
                  {d.category}
                </p>
                <h4 className="text-base font-semibold text-heading mb-3">
                  {d.title}
                </h4>
                <ul className="space-y-1.5 text-sm text-muted">
                  {d.systems.map((s) => (
                    <li key={s} className="flex gap-2 items-start">
                      <span className={`${d.accent.text} mt-1`} aria-hidden>
                        ▸
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Change-cascade callout */}
        <div className="mt-10 rounded-xl border-l-4 border-brand-blue bg-brand-blue/10 p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-blue mb-2">
            CHANGE CASCADE
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed">
            When a standard or regulation is revised, the change propagates
            automatically through the thread — inspection plans, MOC workflows,
            supplier obligations, and design records all see the impact. MOC
            becomes proactive, not reactive. Audit conformance is a continuous
            system state, not a pre-inspection scramble.
          </p>
        </div>
      </div>
    </section>
  );
}
