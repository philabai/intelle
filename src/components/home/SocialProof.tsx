export function SocialProof() {
  const clients = [
    "Aramco",
    "ADNOC",
    "Shell",
    "Chevron",
    "SABIC",
    "Boeing",
    "NASA",
    "SpaceX",
    "Lockheed Martin",
  ];

  return (
    <section className="py-12 border-t border-card-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm uppercase tracking-widest text-muted mb-8">
          Trusted by engineering teams at
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {clients.map((client) => (
            <span
              key={client}
              className="px-5 py-2.5 rounded-full bg-card-bg border border-card-border text-sm font-medium text-muted/80"
            >
              {client}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
