import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ComprarContent from "./ComprarContent";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export const dynamic = "force-dynamic";

export default async function ComprarPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        account: {
          select: { packageId: true },
        },
      },
    });

    const packageId = user?.account?.packageId;
    redirect(packageId
      ? `/dashboard/upgrade?packageId=${encodeURIComponent(packageId)}`
      : "/dashboard/upgrade");
  }

  return <ComprarContent />;
}
