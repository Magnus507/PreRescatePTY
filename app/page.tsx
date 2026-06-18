import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import MobileStickyCTA from "@/components/public/MobileStickyCTA";
import HeroSection from "@/components/public/sections/HeroSection";
import BenefitMarquee from "@/components/public/sections/BenefitMarquee";
import WhatIsSection from "@/components/public/sections/WhatIsSection";
import HowItWorksSection from "@/components/public/sections/HowItWorksSection";
import WhoIsForSection from "@/components/public/sections/WhoIsForSection";
import DemoSection from "@/components/public/sections/DemoSection";
import PrivacySection from "@/components/public/sections/PrivacySection";
import PlansPreview from "@/components/public/sections/PlansPreview";
import CorporatePreview from "@/components/public/sections/CorporatePreview";
import FAQPreview from "@/components/public/sections/FAQPreview";
import FinalCTA from "@/components/public/sections/FinalCTA";

export default function Home() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <HeroSection />
        <BenefitMarquee />
        <WhatIsSection />
        <HowItWorksSection />
        <WhoIsForSection />
        <DemoSection />
        <PrivacySection />
        <PlansPreview />
        <CorporatePreview />
        <FAQPreview />
        <FinalCTA />
      </main>
      <PublicFooter />
      <MobileStickyCTA />
    </div>
  );
}