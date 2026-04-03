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
    "Sistema panameño de identificación de emergencia con Chip NFC + QR y perfil médico accesible al instante. Protege lo que más importa.",
  keywords: [
    "emergencia", "socorro", "NFC", "QR", "Panamá",
    "identificación médica", "rescate", "seguridad", "salud",
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
