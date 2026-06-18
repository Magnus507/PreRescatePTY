import type { Metadata } from "next";
import ParaQuienEsContent from "./ParaQuienEsContent";

export const metadata: Metadata = {
  title: {
    absolute: "¿Para Quién es PreRescue ID? — Familias, Personas y Empresas",
  },
  description:
    "Identificación médica para familias, niños, adultos mayores, personas con condiciones médicas, viajeros, conductores y organizaciones.",
  openGraph: {
    title: "¿Para Quién es PreRescue ID? — Familias, Personas y Empresas",
    description:
      "Identificación médica para familias, niños, adultos mayores, personas con condiciones médicas, viajeros, conductores y organizaciones.",
    url: "https://www.prerescatepty.com/para-quien-es",
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
    title: "¿Para Quién es PreRescue ID? — Familias, Personas y Empresas",
    description:
      "Identificación médica para familias, niños, adultos mayores, personas con condiciones médicas, viajeros, conductores y organizaciones.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function ParaQuienEsPage() {
  return <ParaQuienEsContent />;
}