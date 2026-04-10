import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/constants";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";

const industry = INDUSTRIES[2];
export const metadata: Metadata = { title: `${industry.title} Services`, description: industry.description };

export default function MedicalDevicesPage() {
  return (
    <>
      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/industries" className="hover:text-white">Industries</Link><span>/</span>
            <span className="text-white">{industry.title}</span>
          </nav>
        </div>
      </div>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-6">
              <ServiceIcon name={industry.icon} className="text-brand-blue" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{industry.title}</h1>
            <p className="mt-6 text-lg text-muted">{industry.description}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-card-bg border border-card-border">
              <h3 className="text-lg font-semibold text-white mb-4">Applicable Standards</h3>
              <div className="flex flex-wrap gap-2">
                {industry.standards.map((s) => (<span key={s} className="px-3 py-1.5 rounded-full bg-brand-teal/10 text-brand-teal text-sm">{s}</span>))}
              </div>
            </div>
            <div className="p-6 rounded-xl bg-card-bg border border-card-border">
              <h3 className="text-lg font-semibold text-white mb-4">Key Clients & Organizations</h3>
              <div className="flex flex-wrap gap-2">
                {industry.clients.map((c) => (<span key={c} className="px-3 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm">{c}</span>))}
              </div>
            </div>
          </div>
          <div className="mt-12 text-center"><Button href="/contact" size="lg">Discuss Your Needs</Button></div>
        </div>
      </section>
    </>
  );
}
