export function TldrCallout({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <aside className="my-8 rounded-xl border-l-4 border-brand-teal bg-brand-teal/5 p-5 sm:p-6">
      <p className="text-xs font-bold tracking-[0.2em] text-brand-teal mb-3">
        TL;DR
      </p>
      <ul className="space-y-2 m-0 p-0 list-none">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
            <span className="text-brand-teal font-bold mt-0.5">▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
