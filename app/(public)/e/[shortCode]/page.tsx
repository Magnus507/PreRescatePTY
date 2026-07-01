import type { Metadata } from "next";
import EmergencyProfileClient from "./client";

export const metadata: Metadata = {
  title: "PreRescatePTY — Estado del producto",
  description:
    "Pantalla pública segura para productos PreRescatePTY antes de la activación.",
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
    title: "PreRescatePTY — Estado del producto",
    description:
      "Pantalla pública segura para productos PreRescatePTY antes de la activación.",
    type: "website",
    locale: "es_PA",
  },
  twitter: {
    card: "summary",
    title: "PreRescatePTY — Estado del producto",
    description:
      "Pantalla pública segura para productos PreRescatePTY antes de la activación.",
  },
};

export default function EmergencyProfilePage() {
  return <EmergencyProfileClient />;
}
