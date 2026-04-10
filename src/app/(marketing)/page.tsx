import { HeroSection } from "@/components/home/HeroSection";
import { ServiceOverview } from "@/components/home/ServiceOverview";
import { CredentialsStrip } from "@/components/home/CredentialsStrip";
import { IndustriesPreview } from "@/components/home/IndustriesPreview";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServiceOverview />
      <CredentialsStrip />
      <IndustriesPreview />
      <CTASection />
    </>
  );
}
