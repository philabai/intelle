export type ComparisonSpec = {
  title: string;
  left: { header: string; items: { title: string; subtitle?: string }[] };
  right: { header: string; items: { title: string; subtitle?: string }[] };
};

export function DiagramComparison({ spec }: { spec: ComparisonSpec }) {
  return (
    <figure className="my-10 rounded-xl border border-card-border bg-card-bg overflow-hidden not-prose">
      <div className="bg-brand-navy text-white px-5 py-3 text-xs font-bold tracking-[0.18em]">
        {spec.title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-card-border">
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand-teal mb-4">
            {spec.left.header}
          </p>
          <ol className="space-y-4 list-none m-0 p-0">
            {spec.left.items.map((it, i) => (
              <li key={i} className="text-sm border-l-4 border-brand-teal/70 pl-3">
                <span className="block text-[10px] font-bold text-brand-teal/80 tracking-widest mb-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="block font-semibold text-foreground leading-snug">
                  {it.title}
                </span>
                {it.subtitle && (
                  <span className="block text-xs text-muted mt-1 leading-relaxed">
                    {it.subtitle}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-red-400 mb-4">
            {spec.right.header}
          </p>
          <ol className="space-y-4 list-none m-0 p-0">
            {spec.right.items.map((it, i) => (
              <li key={i} className="text-sm border-l-4 border-red-400/70 pl-3">
                <span className="block text-[10px] font-bold text-red-400/80 tracking-widest mb-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="block font-semibold text-foreground leading-snug">
                  {it.title}
                </span>
                {it.subtitle && (
                  <span className="block text-xs text-muted mt-1 leading-relaxed">
                    {it.subtitle}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  );
}
