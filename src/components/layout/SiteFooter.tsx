import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SITE, FOOTER_LINKS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-card-border bg-card-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted max-w-xs">
              {SITE.tagline}
            </p>
            <p className="mt-2 text-sm text-muted/60">
              A brand of {SITE.legalEntity}
            </p>
            <div className="mt-4 space-y-1 text-sm text-muted">
              <p>{SITE.locations.primary}</p>
              <p>{SITE.email}</p>
            </div>
          </div>

          {/* Research Services */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              Research Services
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.research.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Implementation Services */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              Implementation Services
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.engineering.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-card-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted/60">
            &copy; {new Date().getFullYear()} {SITE.legalEntity}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
