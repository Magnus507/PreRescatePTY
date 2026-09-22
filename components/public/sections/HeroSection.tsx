"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Battery,
  HeartPulse,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
  Zap,
} from "lucide-react";

const trustItems = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "Pago único" },
];

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="emergency-canvas relative isolate min-h-[100svh] overflow-hidden bg-[#020307] text-white">
      <div aria-hidden="true" className="emergency-grid absolute inset-0 -z-30" />
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(60%_65%_at_76%_34%,rgba(12,81,180,.28),transparent_62%),radial-gradient(46%_55%_at_8%_54%,rgba(214,18,26,.18),transparent_66%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-[#03060c] via-[#03060c]/90 to-transparent" />

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { opacity: [0.35, 0.8, 0.35], scaleX: [0.98, 1.02, 0.98] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-0 right-0 top-[27%] -z-10 hidden h-28 md:block"
      >
        <svg viewBox="0 0 1440 120" className="h-full w-full opacity-20" preserveAspectRatio="none">
          <path
            d="M0 63 H350 L390 63 L414 24 L450 102 L485 50 L515 63 H760 L802 63 L827 35 L852 83 L880 63 H1440"
            fill="none"
            stroke="url(#pulseGradient)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <linearGradient id="pulseGradient" x1="0" x2="1">
              <stop offset="0" stopColor="#17396f" stopOpacity="0" />
              <stop offset=".36" stopColor="#ef2d35" />
              <stop offset=".62" stopColor="#ef2d35" />
              <stop offset="1" stopColor="#17396f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1500px] items-center gap-9 px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:grid-cols-[.86fr_1.14fr] lg:gap-10 lg:px-10 xl:px-14">
        <div className="relative z-20 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-rose-100 shadow-[0_0_34px_-14px_rgba(239,45,53,.9)] backdrop-blur-xl sm:mb-7 sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.2em]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4650] opacity-45" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff4650]" />
            </span>
            Prepárate antes de necesitarlo
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.64, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[12ch] text-[clamp(2.8rem,12vw,3.6rem)] font-black leading-[0.89] tracking-[-0.055em] text-[#f7f9ff] sm:text-[clamp(3.5rem,7vw,6.9rem)] sm:leading-[0.86]"
          >
            Cuando cada segundo cuenta,
            <span className="mt-2 block text-[#ff3038] drop-shadow-[0_0_30px_rgba(218,26,33,.28)]">
              tu información debe estar cerca.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-300 sm:mt-7 sm:text-lg sm:leading-8"
          >
            PreRescue ID conecta una identificación física con QR + NFC a la información pública que tú decides mostrar, para facilitar una consulta rápida desde cualquier navegador compatible.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row"
          >
            <Link
              href="/comprar"
              className="emergency-button group inline-flex min-h-[54px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]"
            >
              Ver productos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/como-funciona"
              className="group inline-flex min-h-[54px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/[0.11] bg-black/30 px-6 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:border-sky-300/30 sm:hover:bg-white/[0.065]"
            >
              <Zap className="h-4 w-4 text-sky-300" />
              Cómo funciona
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-7 grid grid-cols-2 gap-2.5 border-t border-white/[0.08] pt-5 sm:mt-9 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3 sm:pt-6"
          >
            {trustItems.map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-slate-400 sm:text-xs">
                <item.icon className="h-4 w-4 shrink-0 text-sky-300" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>

          <div className="mt-4 flex items-start gap-2 text-[10px] leading-[18px] text-slate-500 sm:mt-5 sm:text-[11px] sm:leading-5">
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            El teléfono que consulta el perfil necesita internet. El identificador NFC pasivo no necesita batería ni conexión propia.
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[820px]"
        >
          <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_55%_42%,rgba(35,110,255,.22),transparent_48%),radial-gradient(circle_at_23%_73%,rgba(218,26,33,.18),transparent_42%)] blur-2xl" />
          <div className="emergency-product-frame relative overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-[#06080d] p-2 shadow-[0_42px_130px_-55px_rgba(0,0,0,.98)] sm:rounded-[2.2rem] sm:p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] border border-white/[0.07] bg-[#080b12] sm:rounded-[1.75rem]">
              <Image
                src="/media/sticker-emergency.avif"
                alt="Sticker PreRescue ID de emergencia con QR y NFC"
                fill
                priority
                sizes="(max-width: 1024px) 94vw, 760px"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/12" />
              <motion.div
                aria-hidden="true"
                animate={reduceMotion ? undefined : { y: ["-10%", "820%"] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                className="absolute inset-x-5 top-5 h-px bg-gradient-to-r from-transparent via-[#ff4550] to-transparent shadow-[0_0_24px_rgba(255,69,80,.95)]"
              />

              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/55 px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-200 backdrop-blur-xl sm:left-5 sm:top-5 sm:text-[9px]">
                <HeartPulse className="h-3.5 w-3.5 text-[#ff4550]" />
                Emergency ready
              </div>

              <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-1.5 sm:bottom-5 sm:left-5 sm:right-5 sm:gap-2">
                {[
                  ["01", "Escanea"],
                  ["02", "Consulta"],
                  ["03", "Contacta"],
                ].map(([step, label]) => (
                  <div key={step} className="rounded-xl border border-white/[0.11] bg-black/48 px-2 py-2.5 backdrop-blur-xl sm:rounded-2xl sm:px-3 sm:py-3">
                    <p className="text-[7px] font-black tracking-[0.16em] text-[#ff5660] sm:text-[8px]">{step}</p>
                    <p className="mt-0.5 text-[9px] font-extrabold text-white sm:text-[11px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -right-1 top-[22%] hidden rounded-2xl border border-sky-300/15 bg-[#07101d]/85 px-4 py-3 shadow-xl backdrop-blur-xl sm:block">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-sky-300">QR + NFC</p>
            <p className="mt-1 text-[11px] font-bold text-slate-300">Dos formas de acceso</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
