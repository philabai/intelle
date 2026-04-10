import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>Terms of Service</h1>
        <p className="text-muted">Last updated: April 2026</p>
        <p>These Terms of Service govern your use of the {SITE.name} website operated by {SITE.legalEntity}.</p>

        <h2>Use of Services</h2>
        <p>Our website provides information about our research and engineering intelligence services. By accessing this website, you agree to these terms.</p>

        <h2>Intellectual Property</h2>
        <p>All content on this website, including text, graphics, logos, and images, is the property of {SITE.legalEntity} and is protected by applicable intellectual property laws.</p>

        <h2>Limitation of Liability</h2>
        <p>The information provided on this website is for general informational purposes only. {SITE.legalEntity} makes no warranties about the accuracy or completeness of this information.</p>

        <h2>Confidentiality</h2>
        <p>Any information shared through our contact form or during consultations may be treated as confidential. Specific confidentiality terms will be outlined in individual engagement agreements.</p>

        <h2>Governing Law</h2>
        <p>These terms shall be governed by and construed in accordance with the laws of the United Arab Emirates.</p>

        <h2>Contact</h2>
        <p>For questions about these terms, contact us at {SITE.email}.</p>
      </div>
    </section>
  );
}
