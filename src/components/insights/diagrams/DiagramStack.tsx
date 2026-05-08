export type StackSpec = {
  title: string;
  subtitle?: string;
  layers: {
    name: string;
    description: string;
    failRate?: "low" | "medium" | "high" | "highest";
  }[];
};

const RATE_COLORS: Record<string, string> = {
  low: "text-brand-teal",
  medium: "text-yellow-400",
  high: "text-orange-400",
  highest: "text-red-400",
};

export function DiagramStack({ spec }: { spec: StackSpec }) {
  return (
    <figure className="my-10 rounded-xl border border-card-border bg-card-bg overflow-hidden not-prose">
      <div className="bg-brand-navy text-white px-5 py-3">
        <p className="text-xs font-bold tracking-[0.18em]">{spec.title}</p>
        {spec.subtitle && (
          <p className="text-[11px] text-white/60 mt-1">{spec.subtitle}</p>
        )}
      </div>
      <div className="p-5 space-y-3">
        {spec.layers.map((layer, i) => {
          const isFoundation = i === spec.layers.length - 1;
          return (
            <div
              key={i}
              className="grid grid-cols-[110px_1fr] gap-3 items-stretch"
            >
              <div className="flex items-center justify-end pr-2">
                <p className="text-[10px] font-bold tracking-widest text-muted uppercase">
                  Fail rate:{" "}
                  <span className={RATE_COLORS[layer.failRate || "low"] || ""}>
                    {(layer.failRate || "low").toUpperCase()}
                  </span>
                </p>
              </div>
              <div
                className={`rounded-lg border p-4 ${
                  isFoundation
                    ? "bg-brand-teal/10 border-brand-teal/40"
                    : "bg-background border-card-border"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">{layer.name}</p>
                  <p className="text-[10px] tracking-widest text-muted">
                    Layer {spec.layers.length - i}
                    {isFoundation ? " — load-bearing" : ""}
                  </p>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {layer.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
