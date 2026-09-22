import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "./visual-performance.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import CookieConsentProvider from "@/components/public/CookieConsentProvider";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

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
    default: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    template: "%s | PreRescue ID",
  },
  description:
    "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Pago único y servicio digital sin vencimiento por tiempo.",
  keywords: [
    "identificación de emergencia", "retorno seguro", "mascotas", "NFC", "QR", "Panamá",
    "perfil médico", "alergias", "tipo de sangre", "seguridad",
  ],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro, sin instalar una aplicación.",
    type: "website",
    locale: "es_PA",
    siteName: "PreRescue ID",
    url: "https://www.prerescatepty.com",
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
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificación de emergencia y retorno seguro con QR y NFC. Sin aplicación.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      </body>
    </html>
  );
}
