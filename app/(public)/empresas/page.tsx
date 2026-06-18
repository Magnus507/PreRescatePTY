import type { Metadata } from "next";
import EmpresasContent from "./EmpresasContent";

export const metadata: Metadata = {
  title: {
    absolute: "PreRescue ID para Empresas — Identificación Médica Corporativa",
  },
  description:
    "Gestiona miembros, perfiles y asignación de identificaciones médicas con QR y NFC para empresas e instituciones.",
  openGraph: {
    title: "PreRescue ID para Empresas — Identificación Médica Corporativa",
    description:
      "Gestiona miembros, perfiles y asignación de identificaciones médicas con QR y NFC para empresas e instituciones.",
    url: "https://www.prerescatepty.com/empresas",
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
    title: "PreRescue ID para Empresas — Identificación Médica Corporativa",
    description:
      "Gestiona miembros, perfiles y asignación de identificaciones médicas con QR y NFC para empresas e instituciones.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function EmpresasPage() {
  return <EmpresasContent />;
}