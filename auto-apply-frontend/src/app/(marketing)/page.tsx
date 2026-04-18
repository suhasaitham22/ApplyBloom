import { MarketingHero } from "@/features/marketing/components/hero";
import { ProblemSection } from "@/features/marketing/components/sections/problem";
import { PipelineSection } from "@/features/marketing/components/sections/pipeline";
import { TailoringSection } from "@/features/marketing/components/sections/tailoring";
import { CommandCenterSection } from "@/features/marketing/components/sections/command-center";
import { InfraSection } from "@/features/marketing/components/sections/infra";
import { FinalCtaSection } from "@/features/marketing/components/sections/final-cta";
import { ScrollProgress } from "@/features/marketing/components/animations/scroll-progress";
import { CursorSpotlight } from "@/features/marketing/components/animations/cursor-spotlight";
import { AmbientField } from "@/features/marketing/components/animations/ambient-field";
import { SectionDivider } from "@/features/marketing/components/animations/section-divider";

export default function LandingPage() {
  return (
    <>
      <AmbientField />
      <CursorSpotlight />
      <ScrollProgress />
      <div className="relative z-10">
        <MarketingHero />
        <SectionDivider label="01 · The problem" />
        <ProblemSection />
        <SectionDivider label="02 · How it works" />
        <PipelineSection />
        <SectionDivider label="03 · Guardrails" />
        <TailoringSection />
        <SectionDivider label="04 · Studio" />
        <CommandCenterSection />
        <SectionDivider label="05 · Infra" />
        <InfraSection />
        <SectionDivider label="06 · Begin" />
        <FinalCtaSection />
      </div>
    </>
  );
}
