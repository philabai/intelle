import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-brand-blue/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-brand-teal/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-6">
            Engineering Intelligence for GCC + India
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl lg:text-6xl">
            Engineering intelligence that drives{" "}
            <GradientText>real outcomes.</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Senior practitioner-led research and implementation services for NOCs, EPCs, and industrial scale-ups across the GCC and India.
            Faster than Tier-1 consultancies, deeper than analyst reports — at 30–50% of the cost.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/book" size="lg">
              Book a 30-Min Discovery Call
            </Button>
            <Button href="/research" variant="outline" size="lg">
              Explore Our Services
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
