import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { SITE, FOOTER_LINKS } from "@/lib/constants";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-card-border bg-card-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted max-w-xs">
              {t("tagline")}
            </p>
            <p className="mt-2 text-sm text-muted/60">
              {t("brandOf", { entity: SITE.legalEntity })}
            </p>
            <div className="mt-4 space-y-1 text-sm text-muted">
              <p>{SITE.locations.primary}</p>
              <p>{SITE.email}</p>
            </div>
          </div>

          {/* Research Services */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              {t("researchServices")}
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.research.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Implementation Services */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              {t("implementationServices")}
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.engineering.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              {t("company")}
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-brand-teal transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-card-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted/60">
            {t("allRightsReserved", {
              year: new Date().getFullYear(),
              entity: SITE.legalEntity,
            })}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              href="/cookies"
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              {t("cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
