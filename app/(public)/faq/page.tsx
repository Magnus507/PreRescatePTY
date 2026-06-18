import type { Metadata } from "next";
import FAQContent from "./FAQContent";

export const metadata: Metadata = {
  title: {
    absolute: "Preguntas Frecuentes — PreRescue ID",
  },
  description:
    "Resuelve dudas sobre QR, NFC, privacidad, activación, perfiles, pagos y uso de PreRescue ID.",
  openGraph: {
    title: "Preguntas Frecuentes — PreRescue ID",
    description:
      "Resuelve dudas sobre QR, NFC, privacidad, activación, perfiles, pagos y uso de PreRescue ID.",
    url: "https://www.prerescatepty.com/faq",
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
    title: "Preguntas Frecuentes — PreRescue ID",
    description:
      "Resuelve dudas sobre QR, NFC, privacidad, activación, perfiles, pagos y uso de PreRescue ID.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function FAQPage() {
  return <FAQContent />;
}