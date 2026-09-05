import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import CookieConsentProvider from "@/components/public/CookieConsentProvider";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import VisualPerformanceLayer from "@/components/VisualPerformanceLayer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
  style: ["italic", "normal"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#DA1A21",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.prerescatepty.com"),
  title: {
    default: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
    template: "%s | PreRescue ID",
  },
  description:
    "Identificación médica de emergencia con QR y NFC. Consulta información autorizada sin instalar una aplicación. Pago único y 2 años de vigencia.",
  keywords: [
    "identificación médica", "emergencia", "NFC", "QR", "Panamá",
    "perfil médico", "alergias", "tipo de sangre", "seguridad",
  ],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
    description:
      "Identificación médica de emergencia con QR y NFC. Consulta información autorizada sin instalar una aplicación.",
    type: "website",
    locale: "es_PA",
    siteName: "PreRescue ID",
    url: "https://www.prerescatepty.com",
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
    title: "PreRescue ID — Identificación Médica de Emergencia con QR y NFC",
    description:
      "Identificación médica de emergencia con QR y NFC. Sin aplicación. Sin batería.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading request headers keeps the layout dynamic so Next can propagate the
  // request CSP nonce to framework scripts.
  await headers();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
        <CookieConsentProvider />
        <ServiceWorkerRegistrar />
        <VisualPerformanceLayer />
      </body>
    </html>
  );
}
