import Link from "next/link";
import type { ServiceCategory } from "@/lib/types";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";

export function EngineeringServiceDetail({ service }: { service: ServiceCategory }) {
  return (
    <>
      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/engineering" className="hover:text-white transition-colors">Engineering Services</Link>
            <span>/</span>
            <span className="text-white">{service.title}</span>
          </nav>
        </div>
      </div>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                <ServiceIcon name={service.icon} className="text-brand-blue" size={24} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
                Engineering Service
              </p>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              {service.title}
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {service.description}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">
            What We <GradientText variant="blue-violet">Deliver</GradientText>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.deliverables.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">Capabilities</h2>
          <div className="flex flex-wrap gap-3">
            {service.focusAreas.map((area) => (
              <span key={area} className="px-4 py-2 rounded-full bg-card-bg border border-card-border text-sm text-muted hover:border-brand-blue/30 hover:text-brand-blue transition-colors">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Let us help you maximize the value of your engineering intelligence platform.
          </p>
          <Button href="/contact" size="lg">Schedule a Consultation</Button>
        </div>
      </section>
    </>
  );
}
