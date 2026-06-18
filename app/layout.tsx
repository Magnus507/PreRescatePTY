import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <Analytics />
        <SpeedInsights />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) { 
                      registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker == null) return;
                        installingWorker.onstatechange = () => {
                          if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                              window.location.reload();
                            }
                          }
                        };
                      };
                    }
                  );
                });

                if (localStorage.getItem('app_version') !== '2.7.0') {
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      for (let name of names) caches.delete(name);
                    });
                  }
                  localStorage.setItem('app_version', '2.7.0');
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
