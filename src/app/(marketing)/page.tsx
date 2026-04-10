import { HeroSection } from "@/components/home/HeroSection";
import { ServiceOverview } from "@/components/home/ServiceOverview";
import { CredentialsStrip } from "@/components/home/CredentialsStrip";
import { SocialProof } from "@/components/home/SocialProof";
import { MethodologyPreview } from "@/components/home/MethodologyPreview";
import { IndustriesPreview } from "@/components/home/IndustriesPreview";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServiceOverview />
      <CredentialsStrip />
      <SocialProof />
      <MethodologyPreview />
      <IndustriesPreview />
      <CTASection />
    </>
  );
}
