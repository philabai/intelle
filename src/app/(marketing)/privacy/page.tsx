import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>Privacy Policy</h1>
        <p className="text-muted">Last updated: April 2026</p>
        <p>{SITE.legalEntity} (&quot;{SITE.name}&quot;, &quot;we&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>

        <h2>Information We Collect</h2>
        <p>We collect information you voluntarily provide through our contact form, including your name, email address, company name, phone number, and message content.</p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To respond to your inquiries and service requests</li>
          <li>To communicate about our services</li>
          <li>To improve our website and services</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>Data Retention</h2>
        <p>We retain your personal information only as long as necessary to fulfill the purposes for which it was collected, or as required by law.</p>

        <h2>Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.</p>

        <h2>Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal information. To exercise these rights, please contact us at {SITE.email}.</p>

        <h2>Third-Party Services</h2>
        <p>We may use third-party services (such as analytics and email providers) that collect and process data on our behalf. These services are bound by their own privacy policies.</p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy from time to time. Changes will be posted on this page with an updated revision date.</p>

        <h2>Contact Us</h2>
        <p>For questions about this privacy policy, contact us at {SITE.email} or {SITE.phone.dubai}.</p>
        <p>{SITE.legalEntity}<br />{SITE.locations.primary}</p>
      </div>
    </section>
  );
}
