import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "PreRescate PTY — Identificación de Emergencia",
    template: "%s | PreRescate PTY",
  },
  description:
    "Sistema panameño de identificación de emergencia para motociclistas. Chip NFC + QR con perfil médico accesible al instante.",
  keywords: [
    "emergencia", "motociclista", "NFC", "QR", "Panamá",
    "identificación médica", "rescate", "seguridad vial",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
