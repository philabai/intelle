import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";

export function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-teal/10 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-heading sm:text-4xl">
          Ready to elevate your{" "}
          <GradientText>engineering intelligence?</GradientText>
        </h2>
        <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
          Whether you need bespoke research, engineering implementation
          services, or strategic advisory, we deliver outcomes that matter.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/contact" size="lg">
            Schedule a Consultation
          </Button>
          <Button href="/about" variant="outline" size="lg">
            Learn About Us
          </Button>
        </div>
      </div>
    </section>
  );
}
