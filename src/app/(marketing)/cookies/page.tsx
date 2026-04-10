import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>Cookie Policy</h1>
        <p className="text-muted">Last updated: April 2026</p>
        <p>This policy explains how {SITE.name} ({SITE.legalEntity}) uses cookies and similar technologies.</p>

        <h2>What Are Cookies</h2>
        <p>Cookies are small text files stored on your device when you visit a website. They help provide a better user experience.</p>

        <h2>Cookies We Use</h2>
        <h3>Essential Cookies</h3>
        <p>Required for the website to function properly. These cannot be disabled.</p>
        <h3>Analytics Cookies</h3>
        <p>We use Google Analytics to understand how visitors interact with our website. These cookies collect anonymous usage data.</p>
        <h3>Authentication Cookies</h3>
        <p>Used to maintain admin sessions for content management purposes.</p>

        <h2>Managing Cookies</h2>
        <p>You can control cookies through your browser settings. Disabling certain cookies may affect website functionality.</p>

        <h2>Contact</h2>
        <p>For questions about our cookie policy, contact us at {SITE.email}.</p>
      </div>
    </section>
  );
}
