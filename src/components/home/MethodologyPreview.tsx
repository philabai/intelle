import Link from "next/link";
import { GradientText } from "@/components/ui/GradientText";

const steps = [
  {
    num: "01",
    title: "Intelligence Requirements",
    description: "We define exactly what you need to decide -- not a generic brief.",
  },
  {
    num: "02",
    title: "Multi-Source Research",
    description: "Proprietary databases, public datasets, expert networks, and primary interviews.",
  },
  {
    num: "03",
    title: "Practitioner Validation",
    description: "Findings reviewed by someone who has operated in your industry.",
  },
  {
    num: "04",
    title: "Actionable Delivery",
    description: "Decision-ready intelligence, not shelfware.",
  },
];

export function MethodologyPreview() {
  return (
    <section className="py-16 border-t border-card-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-3">
            Our Approach
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            How We Deliver <GradientText>Intelligence</GradientText>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-xl bg-card-bg border border-card-border"
            >
              <p className="text-4xl font-bold text-brand-teal/20 mb-3">
                {step.num}
              </p>
              <h3 className="text-base font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/about"
            className="text-sm text-brand-teal hover:text-brand-teal/80 transition-colors"
          >
            Learn more about our approach &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
