import type { Metadata } from "next";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import MobileStickyCTA from "@/components/public/MobileStickyCTA";
import HeroSection from "@/components/public/sections/HeroSection";
import BenefitMarquee from "@/components/public/sections/BenefitMarquee";
import PlansPreview from "@/components/public/sections/PlansPreview";
import CommunityBand from "@/components/public/sections/CommunityBand";
import EmergencyTimeline from "@/components/ui/emergency-timeline";

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
    <div className="public-home min-h-screen bg-[#fbfcff] font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <HeroSection />
        <BenefitMarquee />
        <EmergencyTimeline />
        <PlansPreview />
        <CommunityBand />
      </main>
      <PublicFooter />
      <MobileStickyCTA />
    </div>
  );
}
