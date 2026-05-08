export type SequenceSpec = {
  title: string;
  steps: {
    label: string;
    title: string;
    description: string;
    accentColor?: "teal" | "blue" | "violet" | "pink";
  }[];
};

const ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  teal: { bg: "bg-brand-teal", text: "text-brand-teal", border: "border-brand-teal" },
  blue: { bg: "bg-brand-blue", text: "text-brand-blue", border: "border-brand-blue" },
  violet: { bg: "bg-brand-violet", text: "text-brand-violet", border: "border-brand-violet" },
  pink: { bg: "bg-pink-500", text: "text-pink-500", border: "border-pink-500" },
};

const DEFAULT_ACCENTS: ("teal" | "blue" | "violet" | "pink")[] = ["teal", "blue", "violet", "pink"];

export function DiagramSequence({ spec }: { spec: SequenceSpec }) {
  return (
    <figure className="my-10 rounded-xl border border-card-border bg-card-bg overflow-hidden not-prose">
      <div className="bg-brand-navy text-white px-5 py-3 text-xs font-bold tracking-[0.18em]">
        {spec.title}
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {spec.steps.map((step, i) => {
            const accent = ACCENT[step.accentColor || DEFAULT_ACCENTS[i % 4]];
            return (
              <div key={i} className="relative">
                <div
                  className={`w-8 h-8 rounded-full ${accent.bg} text-white text-sm font-bold flex items-center justify-center mb-3`}
                >
                  {i + 1}
                </div>
                <div className={`border-t-2 ${accent.border} pt-3`}>
                  <p className={`text-[10px] font-bold tracking-[0.18em] ${accent.text} mb-1`}>
                    {step.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
