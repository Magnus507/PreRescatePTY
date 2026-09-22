import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ComprarContent from "./ComprarContent";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    absolute: "Productos y Precios — PreRescue ID",
  },
  description:
    "Consulta los productos publicados de PreRescue ID y sus precios vigentes. Pago único y servicio digital sin vencimiento por tiempo.",
  openGraph: {
    title: "Productos y Precios — PreRescue ID",
    description:
      "Consulta los productos publicados de PreRescue ID y sus precios vigentes.",
    url: "https://www.prerescatepty.com/comprar",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación de emergencia con QR y NFC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Productos y Precios — PreRescue ID",
    description:
      "Consulta los productos publicados de PreRescue ID y sus precios vigentes.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export const dynamic = "force-dynamic";

export default async function ComprarPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard/tienda");
  }

  return <ComprarContent />;
}
