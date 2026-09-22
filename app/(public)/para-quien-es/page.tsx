import type { Metadata } from "next";
import ParaQuienEsContent from "./ParaQuienEsContent";

export const metadata: Metadata = {
  title: {
    absolute: "¿Para Quién es PreRescue ID? — Personas, Familias y Mascotas",
  },
  description:
    "Identificación para personas, familias y mascotas, con perfiles de emergencia y opciones de retorno seguro según el uso configurado.",
  openGraph: {
    title: "¿Para Quién es PreRescue ID? — Personas, Familias y Mascotas",
    description:
      "Identificación para personas, familias y mascotas, con perfiles de emergencia y opciones de retorno seguro según el uso configurado.",
    url: "https://www.prerescatepty.com/para-quien-es",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación de emergencia y retorno seguro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Para Quién es PreRescue ID? — Personas, Familias y Mascotas",
    description:
      "Identificación para personas, familias y mascotas, con perfiles de emergencia y opciones de retorno seguro según el uso configurado.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function ParaQuienEsPage() {
  return <ParaQuienEsContent />;
}