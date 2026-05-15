/**
 * HeroBackdrop — reusable layered backdrop for hero regions.
 *
 * Layers (variant-dependent):
 *   1. Rotating conic-gradient aurora — slow ~30s rotation (skipped on `detail`)
 *   2. Drifting + breathing gradient orbs — translate + scale combined keyframes
 *   3. Faint SVG dot-grid pattern with radial mask
 *   4. Optional accent diagonal sweep (home only)
 *   5. Optional animated SVG "signal trace" waveform (home only)
 *
 * All visuals are CSS + inline SVG — zero runtime JS, zero extra bytes.
 * Honours `prefers-reduced-motion` via globals.css media query.
 * Mobile-safe: parent must own `overflow-hidden`; orbs use sm:/lg: breakpoints;
 * animation amplitude is reduced on phones via globals.css media query.
 */

type Variant = "full" | "teal" | "blue" | "detail";
type Accent = "blue" | "teal" | "violet";

interface HeroBackdropProps {
  variant?: Variant;
  /** For variant="detail" only — picks an accent palette matching the service */
  accent?: Accent;
}

interface OrbSpec {
  position: string;
  size: string;
  color: string;
  drift: string;
}

const ORBS_FULL: OrbSpec[] = [
  {
    position: "top-[-15%] left-[5%]",
    size: "w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px]",
    color: "bg-brand-teal/[0.16]",
    drift: "hero-drift-slow",
  },
  {
    position: "top-[10%] right-[-10%]",
    size: "w-[320px] h-[320px] sm:w-[550px] sm:h-[550px] lg:w-[800px] lg:h-[800px]",
    color: "bg-brand-blue/[0.16]",
    drift: "hero-drift-mid",
  },
  {
    position: "bottom-[5%] left-[-10%]",
    size: "w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] lg:w-[750px] lg:h-[750px]",
    color: "bg-brand-violet/[0.14]",
    drift: "hero-drift-mid-r",
  },
  {
    position: "bottom-[-15%] right-[10%]",
    size: "w-[260px] h-[260px] sm:w-[450px] sm:h-[450px] lg:w-[650px] lg:h-[650px]",
    color: "bg-brand-blue/[0.12]",
    drift: "hero-drift-slow-r",
  },
];

const ORBS_TEAL: OrbSpec[] = [
  {
    position: "top-[-10%] left-[5%]",
    size: "w-[260px] h-[260px] sm:w-[480px] sm:h-[480px] lg:w-[650px] lg:h-[650px]",
    color: "bg-brand-teal/[0.18]",
    drift: "hero-drift-slow",
  },
  {
    position: "top-[20%] right-[-10%]",
    size: "w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px]",
    color: "bg-brand-blue/[0.12]",
    drift: "hero-drift-mid",
  },
  {
    position: "bottom-[-10%] left-[15%]",
    size: "w-[240px] h-[240px] sm:w-[420px] sm:h-[420px] lg:w-[600px] lg:h-[600px]",
    color: "bg-brand-teal/[0.12]",
    drift: "hero-drift-mid-r",
  },
];

const ORBS_BLUE: OrbSpec[] = [
  {
    position: "top-[-10%] left-[5%]",
    size: "w-[260px] h-[260px] sm:w-[480px] sm:h-[480px] lg:w-[650px] lg:h-[650px]",
    color: "bg-brand-blue/[0.18]",
    drift: "hero-drift-slow",
  },
  {
    position: "top-[20%] right-[-10%]",
    size: "w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px]",
    color: "bg-brand-violet/[0.14]",
    drift: "hero-drift-mid",
  },
  {
    position: "bottom-[-10%] left-[15%]",
    size: "w-[240px] h-[240px] sm:w-[420px] sm:h-[420px] lg:w-[600px] lg:h-[600px]",
    color: "bg-brand-blue/[0.12]",
    drift: "hero-drift-mid-r",
  },
];

const DETAIL_ACCENT: Record<Accent, OrbSpec[]> = {
  blue: [
    {
      position: "top-[-20%] right-[-5%]",
      size: "w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] lg:w-[550px] lg:h-[550px]",
      color: "bg-brand-blue/[0.14]",
      drift: "hero-drift-slow",
    },
    {
      position: "bottom-[-30%] left-[-5%]",
      size: "w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] lg:w-[500px] lg:h-[500px]",
      color: "bg-brand-violet/[0.10]",
      drift: "hero-drift-mid-r",
    },
  ],
  teal: [
    {
      position: "top-[-20%] right-[-5%]",
      size: "w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] lg:w-[550px] lg:h-[550px]",
      color: "bg-brand-teal/[0.14]",
      drift: "hero-drift-slow",
    },
    {
      position: "bottom-[-30%] left-[-5%]",
      size: "w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] lg:w-[500px] lg:h-[500px]",
      color: "bg-brand-blue/[0.10]",
      drift: "hero-drift-mid-r",
    },
  ],
  violet: [
    {
      position: "top-[-20%] right-[-5%]",
      size: "w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] lg:w-[550px] lg:h-[550px]",
      color: "bg-brand-violet/[0.14]",
      drift: "hero-drift-slow",
    },
    {
      position: "bottom-[-30%] left-[-5%]",
      size: "w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] lg:w-[500px] lg:h-[500px]",
      color: "bg-brand-blue/[0.10]",
      drift: "hero-drift-mid-r",
    },
  ],
};

function orbsFor(variant: Variant, accent?: Accent): OrbSpec[] {
  if (variant === "full") return ORBS_FULL;
  if (variant === "teal") return ORBS_TEAL;
  if (variant === "blue") return ORBS_BLUE;
  return DETAIL_ACCENT[accent ?? "blue"];
}

/** Conic-gradient aurora colour stops — variant-specific palettes. */
function auroraGradient(variant: Variant): string {
  if (variant === "teal") {
    return "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(45,212,191,0.18) 60deg, transparent 120deg, rgba(37,99,235,0.14) 200deg, transparent 260deg, rgba(45,212,191,0.10) 320deg, transparent 360deg)";
  }
  if (variant === "blue") {
    return "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(37,99,235,0.18) 60deg, transparent 120deg, rgba(124,58,237,0.14) 200deg, transparent 260deg, rgba(37,99,235,0.10) 320deg, transparent 360deg)";
  }
  // full / default
  return "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(45,212,191,0.16) 60deg, transparent 120deg, rgba(37,99,235,0.18) 200deg, transparent 260deg, rgba(124,58,237,0.14) 320deg, transparent 360deg)";
}

export function HeroBackdrop({
  variant = "full",
  accent = "blue",
}: HeroBackdropProps) {
  const orbs = orbsFor(variant, accent);
  const showSweep = variant === "full";
  const showSignalTrace = variant === "full";
  const showAurora = variant !== "detail";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Layer 1 — slowly rotating conic-gradient aurora (skipped on detail).
          Sized at 200% so the rotation never reveals corners. */}
      {showAurora && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="hero-aurora absolute left-1/2 top-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 opacity-90"
            style={{
              backgroundImage: auroraGradient(variant),
              filter: "blur(60px)",
            }}
          />
        </div>
      )}

      {/* Layer 2 — drifting + breathing orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-3xl ${orb.position} ${orb.size} ${orb.color} ${orb.drift}`}
          aria-hidden
        />
      ))}

      {/* Layer 3 — dot-grid with radial fade-to-center mask */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148, 163, 184, 0.18) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, transparent 30%, black 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, transparent 30%, black 85%)",
        }}
        aria-hidden
      />

      {/* Layer 4 — accent diagonal sweep (home only) */}
      {showSweep && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(45, 212, 191, 0.045) 50%, transparent 70%)",
          }}
          aria-hidden
        />
      )}

      {/* Layer 5 — animated SVG "signal trace" waveform (home only).
          A thin oscilloscope-style trace near the bottom of the hero,
          continuously redrawing left-to-right. */}
      {showSignalTrace && (
        <svg
          className="absolute bottom-[8%] left-0 w-full h-[80px] opacity-40"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="hero-trace-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(45, 212, 191, 0)" />
              <stop offset="30%" stopColor="rgba(45, 212, 191, 0.6)" />
              <stop offset="70%" stopColor="rgba(37, 99, 235, 0.6)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
            </linearGradient>
          </defs>
          <path
            className="hero-trace"
            d="M 0 40 Q 75 10 150 40 T 300 40 T 450 40 T 600 40 T 750 40 T 900 40 T 1050 40 T 1200 40"
            fill="none"
            stroke="url(#hero-trace-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
