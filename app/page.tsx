import type { Metadata } from "next";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import MobileStickyCTA from "@/components/public/MobileStickyCTA";
import HeroSection from "@/components/public/sections/HeroSection";
import BenefitMarquee from "@/components/public/sections/BenefitMarquee";
import WhatIsSection from "@/components/public/sections/WhatIsSection";
import HowItWorksSection from "@/components/public/sections/HowItWorksSection";
import WhoIsForSection from "@/components/public/sections/WhoIsForSection";
import EmergencyShowcase from "@/components/public/sections/EmergencyShowcase";
import PrivacySection from "@/components/public/sections/PrivacySection";
import PlansPreview from "@/components/public/sections/PlansPreview";
import FAQPreview from "@/components/public/sections/FAQPreview";
import FinalCTA from "@/components/public/sections/FinalCTA";

export const metadata: Metadata = {
  title: {
    absolute: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
  },
  description:
    "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Consulta información autorizada y contactos sin instalar aplicaciones.",
  openGraph: {
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Consulta información autorizada y contactos sin instalar aplicaciones.",
    url: "https://www.prerescatepty.com",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación de emergencia y retorno seguro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Consulta información autorizada y contactos sin instalar aplicaciones.",
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
        <EmergencyShowcase />
        <PrivacySection />
        <PlansPreview />
        <FAQPreview />
        <FinalCTA />
      </main>
      <PublicFooter />
      <MobileStickyCTA />
    </div>
  );
}