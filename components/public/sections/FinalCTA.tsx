"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, ScanLine } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#03060c] px-4 py-20 text-white sm:px-6 md:py-28 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-90px" }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.09] bg-[#080c14] px-6 py-14 text-center shadow-[0_50px_130px_-65px_rgba(218,26,33,.7)] sm:px-10 md:py-20"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.30), transparent 64%), radial-gradient(42% 70% at 80% 10%, rgba(37,99,235,.12), transparent 68%)",
          }}
        />
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-rose-400/70 to-transparent shadow-[0_0_30px_rgba(251,113,133,.7)]" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DA1A21]/20 bg-[#DA1A21]/10 shadow-[0_0_40px_-12px_rgba(218,26,33,.8)]">
            <HeartPulse className="h-6 w-6 text-rose-300" />
          </div>
          <p className="mb-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-300/80">PreRescue ID</p>
          <h2 className="text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.88] tracking-[-0.05em] text-slate-50">
            Prepárate antes de necesitarlo.
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Crea tu perfil de emergencia, configura la información visible y conecta tu identificación física con QR + NFC.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/comprar"
              className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white shadow-[0_18px_48px_-18px_rgba(218,26,33,.8)] transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]"
            >
              Ver planes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.045] px-7 text-sm font-bold text-slate-100 transition-all hover:-translate-y-0.5 hover:border-sky-300/25 hover:bg-white/[0.08]"
            >
              <ScanLine className="h-4 w-4 text-sky-300" />
              Probar demo
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
