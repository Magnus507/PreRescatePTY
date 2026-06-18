import type { Metadata } from "next";
import ContactoContent from "./ContactoContent";

export const metadata: Metadata = {
  title: "Contacto — PreRescue ID Panamá",
  description:
    "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
  openGraph: {
    title: "Contacto — PreRescue ID Panamá",
    description:
      "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
    url: "https://www.prerescatepty.com/contacto",
    type: "website",
    locale: "es_PA",
  },
  twitter: {
    card: "summary",
    title: "Contacto — PreRescue ID Panamá",
    description:
      "Contáctanos para consultas sobre planes, soporte general e información corporativa de PreRescue ID.",
  },
};

export default function ContactoPage() {
  return <ContactoContent />;
}