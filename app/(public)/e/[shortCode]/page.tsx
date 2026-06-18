import type { Metadata } from "next";
import EmergencyProfileClient from "./client";

export const metadata: Metadata = {
  title: "Perfil médico de emergencia — PreRescue ID",
  description:
    "Perfil médico de emergencia accesible mediante identificación QR o NFC.",
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
    title: "Perfil médico de emergencia — PreRescue ID",
    description:
      "Perfil médico de emergencia accesible mediante identificación QR o NFC.",
    type: "website",
    locale: "es_PA",
  },
  twitter: {
    card: "summary",
    title: "Perfil médico de emergencia — PreRescue ID",
    description:
      "Perfil médico de emergencia accesible mediante identificación QR o NFC.",
  },
};

export default function EmergencyProfilePage() {
  return <EmergencyProfileClient />;
}