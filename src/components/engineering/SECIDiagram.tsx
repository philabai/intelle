import { GradientText } from "@/components/ui/GradientText";

type Mode = {
  key: "S" | "E" | "C" | "I";
  name: string;
  flow: string;
  tagline: string;
  bullets: string[];
  accent: {
    topBorder: string;
    text: string;
    bg: string;
  };
};

const MODES: Mode[] = [
  {
    key: "S",
    name: "Socialization",
    flow: "Tacit → Tacit",
    tagline: "Knowledge acquired through shared experience.",
    bullets: [
      "Shadowing & apprenticeship for principal engineers",
      "War rooms, field handovers, on-the-tools learning",
      "Communities of practice and peer-to-peer dialogue",
      "Structured mentorship across the dual technical ladder",
    ],
    accent: {
      topBorder: "border-t-brand-teal",
      text: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  },
  {
    key: "E",
    name: "Externalization",
    flow: "Tacit → Explicit",
    tagline: "Articulating tacit expertise into reusable artefacts.",
    bullets: [
      "Design-rationale capture at stage-gates",
      "Structured post-project reviews and lessons-learned",
      "Concept creation and decomposition in NPD",
      "Expert dialogues, mind-mapping, knowledge interviews",
    ],
    accent: {
      topBorder: "border-t-brand-blue",
      text: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
  },
  {
    key: "C",
    name: "Combination",
    flow: "Explicit → Explicit",
    tagline:
      "Aggregating internal and external knowledge into new knowledge for sharing.",
    bullets: [
      "Cross-discipline and cross-industry synthesis",
      "Knowledge-graph linkage across assets, standards, suppliers",
      "RAG-augmented and GraphRAG-enabled synthesis",
      "Standards-aware retrieval over engineering corpora",
    ],
    accent: {
      topBorder: "border-t-brand-violet",
      text: "text-brand-violet",
      bg: "bg-brand-violet/10",
    },
  },
  {
    key: "I",
    name: "Internalization",
    flow: "Explicit → Tacit",
    tagline: "Knowledge applied and absorbed by doing.",
    bullets: [
      "Simulation, training, and design-by-precedent",
      "Learning by doing on instrumented work",
      "Performance KPIs tied to knowledge reuse",
      "Value realisation and feedback into the spiral",
    ],
    accent: {
      topBorder: "border-t-brand-teal",
      text: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  },
];

function ModeCard({ mode }: { mode: Mode }) {
  return (
    <div
      className={`rounded-xl border border-card-border ${mode.accent.topBorder} border-t-4 bg-card-bg p-6 sm:p-7 h-full flex flex-col`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${mode.accent.bg} ${mode.accent.text} text-sm font-bold`}
          aria-hidden
        >
          {mode.key}
        </span>
        <h3 className={`text-xl sm:text-2xl font-semibold ${mode.accent.text}`}>
          {mode.name}
        </h3>
      </div>
      <p className="text-xs uppercase tracking-wider text-muted mb-3">
        {mode.flow}
      </p>
      <p className="text-foreground/90 mb-4">{mode.tagline}</p>
      <ul className="space-y-2 text-sm text-muted mt-auto">
        {mode.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className={`${mode.accent.text} mt-1`} aria-hidden>
              ▸
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SECIDiagram() {
  return (
    <section className="border-t border-card-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-violet mb-3">
            Pillar 1 · Nonaka & Takeuchi
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">
            The SECI{" "}
            <GradientText variant="blue-violet">Knowledge Spiral</GradientText>
          </h2>
          <p className="max-w-3xl mx-auto text-muted">
            Engineering organisations create value when tacit expertise — held
            in the heads of senior engineers — moves through four modes:
            socialised, externalised, combined, and re-internalised. Each turn
            of the spiral compounds institutional capability.
          </p>
        </div>

        {/* Diagram region: 2×2 quadrants with axis labels framing the grid */}
        <div className="relative">
          {/* Top axis label */}
          <div className="hidden md:flex items-center justify-center mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              From&nbsp;Tacit&nbsp;Knowledge
            </span>
          </div>

          <div className="flex">
            {/* Left axis label */}
            <div className="hidden md:flex items-center mr-3">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted whitespace-nowrap"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                To&nbsp;Tacit&nbsp;Knowledge
              </span>
            </div>

            {/* 2×2 quadrant grid + spiral overlay */}
            <div className="relative flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <ModeCard mode={MODES[0]} />
                <ModeCard mode={MODES[1]} />
                {/* Mobile-only down-arrow between rows */}
                <ModeCard mode={MODES[3]} />
                <ModeCard mode={MODES[2]} />
              </div>

              {/* Centre spiral — desktop only, decorative */}
              <svg
                className="hidden md:block pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                width="140"
                height="140"
                viewBox="0 0 140 140"
                aria-hidden
              >
                <defs>
                  <linearGradient id="seci-spiral" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00D4C4" stopOpacity="0.7" />
                    <stop offset="50%" stopColor="#2563FF" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                <circle
                  cx="70"
                  cy="70"
                  r="62"
                  fill="rgba(11,16,32,0.85)"
                  stroke="rgba(124,58,237,0.25)"
                  strokeWidth="1"
                />
                {/* Logarithmic spiral path, parameterised manually */}
                <path
                  d="M 70 70
                     C 70 64, 78 60, 84 64
                     C 92 68, 92 80, 84 86
                     C 74 94, 58 90, 54 78
                     C 48 62, 64 46, 84 48
                     C 108 50, 120 70, 112 92
                     C 102 118, 70 124, 48 110"
                  fill="none"
                  stroke="url(#seci-spiral)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Arrowhead at spiral tail */}
                <path
                  d="M 48 110 L 44 102 M 48 110 L 56 108"
                  fill="none"
                  stroke="#7C3AED"
                  strokeOpacity="0.8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Right axis label */}
            <div className="hidden md:flex items-center ml-3">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted whitespace-nowrap"
                style={{ writingMode: "vertical-rl" }}
              >
                To&nbsp;Explicit&nbsp;Knowledge
              </span>
            </div>
          </div>

          {/* Bottom axis label */}
          <div className="hidden md:flex items-center justify-center mt-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              From&nbsp;Explicit&nbsp;Knowledge
            </span>
          </div>
        </div>

        {/* Mobile-only spiral hint */}
        <div className="md:hidden mt-6 flex items-center justify-center gap-2 text-xs text-muted">
          <span aria-hidden>S</span>
          <span aria-hidden>→</span>
          <span aria-hidden>E</span>
          <span aria-hidden>→</span>
          <span aria-hidden>C</span>
          <span aria-hidden>→</span>
          <span aria-hidden>I</span>
          <span aria-hidden>↻</span>
          <span className="ml-2">The knowledge-creation spiral</span>
        </div>

        <p className="text-xs text-muted text-center mt-8 italic">
          Adapted from Nonaka &amp; Takeuchi (1995), <em>The Knowledge-Creating
          Company</em>, and Nonaka &amp; Konno (1998), &ldquo;The Concept of
          &lsquo;Ba&rsquo;.&rdquo;
        </p>
      </div>
    </section>
  );
}
