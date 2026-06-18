import type { Metadata } from "next";
import ComoFuncionaContent from "./ComoFuncionaContent";

export const metadata: Metadata = {
  title: {
    absolute: "Cómo Funciona PreRescue ID — QR, NFC y Perfil Médico",
  },
  description:
    "Conoce cómo activar, configurar y utilizar una identificación médica de emergencia con QR y NFC.",
  openGraph: {
    title: "Cómo Funciona PreRescue ID — QR, NFC y Perfil Médico",
    description:
      "Conoce cómo activar, configurar y utilizar una identificación médica de emergencia con QR y NFC.",
    url: "https://www.prerescatepty.com/como-funciona",
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
    title: "Cómo Funciona PreRescue ID — QR, NFC y Perfil Médico",
    description:
      "Conoce cómo activar, configurar y utilizar una identificación médica de emergencia con QR y NFC.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function ComoFuncionaPage() {
  return <ComoFuncionaContent />;
}