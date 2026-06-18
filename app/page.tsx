import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    absolute: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
  },
  description:
    "Identificación médica de emergencia con QR y NFC. Muestra información autorizada, contactos y datos médicos relevantes sin instalar aplicaciones.",
  openGraph: {
    title: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
    description:
      "Identificación médica de emergencia con QR y NFC. Muestra información autorizada, contactos y datos médicos relevantes sin instalar aplicaciones.",
    url: "https://www.prerescatepty.com",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación médica con QR y NFC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
    description:
      "Identificación médica de emergencia con QR y NFC. Muestra información autorizada, contactos y datos médicos relevantes sin instalar aplicaciones.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

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