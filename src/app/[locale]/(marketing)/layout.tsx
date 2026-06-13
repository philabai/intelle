import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { IrisWidget } from "@/components/chat/IrisWidget";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen pt-16">{children}</main>
      <SiteFooter />
      <IrisWidget />
    </>
  );
}
