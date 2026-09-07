import type { Metadata } from "next";
import EmergencyProfileClient from "./client";
import ManualContactHardening from "./_components/ManualContactHardening";

export const metadata: Metadata = {
  title: "PreRescatePTY — Perfil de emergencia",
  description:
    "Perfil público de emergencia de PreRescatePTY para identificación y contacto manual.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "PreRescatePTY — Perfil de emergencia",
    description:
      "Perfil público de emergencia de PreRescatePTY para identificación y contacto manual.",
    type: "website",
    locale: "es_PA",
  },
  twitter: {
    card: "summary",
    title: "PreRescatePTY — Perfil de emergencia",
    description:
      "Perfil público de emergencia de PreRescatePTY para identificación y contacto manual.",
  },
};

export default function EmergencyProfilePage() {
  return (
    <div data-manual-contact-only>
      <style>{`[data-manual-contact-only] button:has(.lucide-bell-ring){display:none!important}`}</style>
      <ManualContactHardening />
      <EmergencyProfileClient />
    </div>
  );
}
