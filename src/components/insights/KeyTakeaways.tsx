export function KeyTakeaways({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <aside className="my-10 rounded-xl bg-brand-navy text-white border border-brand-teal/30 p-6 sm:p-8 not-prose">
      <p className="text-xs font-bold tracking-[0.2em] text-white mb-5">
        KEY TAKEAWAYS
      </p>
      <ul className="space-y-4 m-0 p-0 list-none">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-white/90">
            <span className="text-brand-teal font-bold mt-0.5">▶</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
