import type { Metadata } from "next";
import ComprarContent from "./ComprarContent";

export const metadata: Metadata = {
  title: {
    absolute: "Planes y Precios — PreRescue ID",
  },
  description:
    "Consulta los planes disponibles de identificación médica con QR y NFC. Pago único y perfiles configurables.",
  openGraph: {
    title: "Planes y Precios — PreRescue ID",
    description:
      "Consulta los planes disponibles de identificación médica con QR y NFC. Pago único y perfiles configurables.",
    url: "https://www.prerescatepty.com/comprar",
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
    title: "Planes y Precios — PreRescue ID",
    description:
      "Consulta los planes disponibles de identificación médica con QR y NFC. Pago único y perfiles configurables.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function ComprarPage() {
  return <ComprarContent />;
}