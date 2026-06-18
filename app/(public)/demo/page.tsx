import type { Metadata } from "next";
import DemoContent from "./DemoContent";

export const metadata: Metadata = {
  title: "Demo de PreRescue ID — Perfil Médico de Emergencia",
  description:
    "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
  openGraph: {
    title: "Demo de PreRescue ID — Perfil Médico de Emergencia",
    description:
      "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
    url: "https://www.prerescatepty.com/demo",
    type: "website",
    locale: "es_PA",
  },
  twitter: {
    card: "summary",
    title: "Demo de PreRescue ID — Perfil Médico de Emergencia",
    description:
      "Explora un perfil ficticio de demostración y conoce qué información puede mostrarse mediante QR y NFC.",
  },
};

export default function DemoPage() {
  return <DemoContent />;
}