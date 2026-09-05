"use client";

import Link from "next/link";
import { ArrowRight, FileText, Scale } from "lucide-react";
import { motion } from "framer-motion";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

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
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <section className="relative isolate overflow-hidden pb-14 pt-32 md:pb-18 md:pt-40">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20"
            style={{
              background:
                "radial-gradient(52% 58% at 50% 0%, rgba(37,99,235,.14), transparent 62%), radial-gradient(32% 44% at 82% 70%, rgba(218,26,33,.06), transparent 68%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage: "linear-gradient(to bottom, black, transparent 86%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
              <Scale className="h-3.5 w-3.5" />
              Información legal
            </div>
            <h1 className="max-w-[13ch] text-[clamp(3rem,6vw,5.8rem)] font-black leading-[0.9] tracking-[-0.05em] text-slate-50">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
              {description}
            </p>
            {lastUpdated && (
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Última actualización · {lastUpdated}
              </p>
            )}

            <div className="mt-9 rounded-[1.4rem] border border-amber-300/10 bg-amber-300/[0.035] p-5">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/80">
                    Estado del documento
                  </p>
                  <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">
                    Redacción comercial provisional pendiente de revisión legal profesional.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="relative pb-20 pt-6 md:pb-28 md:pt-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.025] p-6 shadow-[0_38px_110px_-72px_rgba(37,99,235,.65)] backdrop-blur-xl sm:p-8 md:p-10">
              <div className="prose prose-invert max-w-none prose-headings:tracking-[-0.025em] prose-headings:text-slate-100 prose-p:text-slate-400 prose-li:text-slate-400 prose-strong:text-slate-200 prose-a:text-sky-300 prose-a:no-underline hover:prose-a:text-sky-200">
                {children}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.055] bg-[#050914] py-14">
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Soporte</p>
              <p className="mt-2 text-sm font-semibold text-slate-400">¿Tienes preguntas sobre este documento?</p>
            </div>
            <Link
              href="/contacto"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-bold text-slate-100 transition-all hover:border-sky-300/20 hover:bg-white/[0.075]"
            >
              Contactar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
