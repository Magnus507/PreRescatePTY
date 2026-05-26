import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#DA1A21",
};

export const metadata: Metadata = {
  title: {
    default: "PreRescue ID — Identificación de Emergencia",
    template: "%s | PreRescue ID",
  },
  description:
    "Sistema panameño de identificación de emergencia con Chip NFC + QR y perfil médico accesible al instante. Protege lo que más importa.",
  keywords: [
    "emergencia", "socorro", "NFC", "QR", "Panamá",
    "identificación médica", "rescate", "seguridad", "salud",
  ],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
      <body className={`${inter.variable} font-sans antialiased`}>
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
