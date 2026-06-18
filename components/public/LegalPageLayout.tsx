"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import Link from "next/link";
import { motion } from "framer-motion";

interface LegalPageLayoutProps {
  title: string;
  description: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({
  title,
  description,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#05070D] py-16 md:py-24"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
              {title}
            </h1>
            <p className="text-lg text-[#A0AEC0] font-medium mb-6">{description}</p>
            {lastUpdated && (
              <p className="text-sm text-[#6B7280]">
                Última actualización: {lastUpdated}
              </p>
            )}
            <div className="mt-8 glass-card-w2a rounded-2xl p-6 md:p-8">
              <p className="text-xs font-bold text-[#DA1A21] mb-4">
                Provisional commercial wording — pending legal review
              </p>
            </div>
          </div>
        </motion.div>

        <section className="py-12 md:py-16 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="prose prose-invert max-w-none">{children}</div>
          </div>
        </section>

        <section className="py-12 bg-[#0c1630]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-[#A0AEC0] mb-4">
              ¿Tienes preguntas sobre esta política?
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all"
            >
              Contactar
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}