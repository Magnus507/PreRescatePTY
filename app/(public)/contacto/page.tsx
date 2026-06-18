import type { Metadata } from "next";
import ContactoContent from "./ContactoContent";

export const metadata: Metadata = {
  title: {
    absolute: "Contacto — PreRescue ID Panamá",
  },
  description:
    "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
  openGraph: {
    title: "Contacto — PreRescue ID Panamá",
    description:
      "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
    url: "https://www.prerescatepty.com/contacto",
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
    title: "Contacto — PreRescue ID Panamá",
    description:
      "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function ContactoPage() {
  return <ContactoContent />;
}