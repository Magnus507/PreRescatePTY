import type { Metadata } from "next";
import DemoContent from "./DemoContent";

export const metadata: Metadata = {
  title: {
    absolute: "Demo de PreRescue ID — Perfil Médico de Emergencia",
  },
  description:
    "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
  openGraph: {
    title: "Demo de PreRescue ID — Perfil Médico de Emergencia",
    description:
      "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
    url: "https://www.prerescatepty.com/demo",
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
    title: "Demo de PreRescue ID — Perfil Médico de Emergencia",
    description:
      "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function DemoPage() {
  return <DemoContent />;
}