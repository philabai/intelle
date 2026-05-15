import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      <HeroBackdrop variant="full" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-6">
            Research. Advisory. Implementation. Support.
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl lg:text-6xl">
            Engineering intelligence that drives{" "}
            <GradientText>real outcomes.</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Standards change. Regulations shift. Late-stage decisions get expensive.
            Bespoke research and implementation that turns engineering complexity into
            defensible decisions — for industrial enterprises that can&apos;t afford the wrong answer.
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
