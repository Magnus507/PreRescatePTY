"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Shield, Scan, Wifi, Battery } from "lucide-react";

const trustItems = [
  { icon: Scan, label: "QR + NFC" },
  { icon: Battery, label: "Sin batería" },
  { icon: Wifi, label: "Sin app" },
  { icon: Shield, label: "2 años de vigencia" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#05070D]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 inset-x-0 h-full bg-[radial-gradient(ellipse_at_top,_rgba(218,26,33,0.08),_transparent_60%)]" />
        <div className="absolute inset-0 noise-bg opacity-30" />
        {/* Animated gradient blob */}
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-[#DA1A21]/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Content */}
          <div className="lg:col-span-7 text-left">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0AEC0] mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DA1A21] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DA1A21]" />
              </span>
              Identificación médica inteligente — Panamá
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-[clamp(2.5rem,6vw,4.5rem)] font-black tracking-tighter leading-[0.92] text-[#EFF4FF] mb-6"
            >
              Tu información médica,{" "}
              <span className="text-[#DA1A21]">accesible al instante</span>
            </motion.h1>

            {/* Editorial accent */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-serif italic text-[clamp(1.25rem,2.5vw,1.75rem)] text-[#DA1A21] mb-6"
            >
              cuando más importa
            </motion.p>

            {/* Supporting statement */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-[clamp(1rem,1.5vw,1.125rem)] text-[#A0AEC0] font-medium leading-relaxed max-w-xl mb-4"
            >
              Identificación médica de emergencia con QR y NFC. No requiere instalar una aplicación y el sticker no necesita batería.
            </motion.p>

            {/* Clarification */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-sm text-[#6B7280] mb-10"
            >
              El dispositivo que realiza el escaneo necesita conexión a internet para consultar el perfil.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-16"
            >
              <Link
                href="/comprar"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#DA1A21] text-white font-bold text-lg overflow-hidden transition-all hover:bg-[#B9141B] hover:shadow-xl hover:shadow-red-500/25 active:scale-[0.98] btn-premium"
              >
                Protegerse Hoy
                <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-[#EFF4FF] font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                Ver Demo
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-5"
            >
              {trustItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-xs font-medium text-[#6B7280]"
                >
                  <item.icon className="h-4 w-4 text-[#10B981]" />
                  {item.label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Product Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative">
              {/* Main product composition */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="relative w-72 h-72 md:w-96 md:h-96">
                  {/* Sticker image */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#0A1128] to-[#05070D] border border-white/10 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <Image
                        src="/sticker-official.png"
                        alt="Sticker PreRescue ID con NFC y QR"
                        width={280}
                        height={280}
                        className="object-contain w-full h-full"
                        priority
                      />
                    </div>
                    {/* NFC signal arcs */}
                    <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full border-2 border-[#10B981]/40 signal-scan" />
                    <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-full bg-[#DA1A21]/10 flex items-center justify-center">
                      <Scan className="h-5 w-5 text-[#DA1A21]" />
                    </div>
                  </div>

                  {/* Floating scan card */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-4 -right-4 md:-top-6 md:-right-6 z-20 glass-card-w2a rounded-2xl p-3 md:p-4 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                      <Scan className="h-4 w-4 md:h-5 md:w-5 text-[#10B981]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Escaneo</p>
                      <p className="text-xs font-bold text-[#EFF4FF]">Perfil cargado</p>
                    </div>
                  </motion.div>

                  {/* Floating privacy card */}
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 z-20 glass-card-w2a rounded-2xl p-3 md:p-4 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-[#DA1A21]/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 md:h-5 md:w-5 text-[#DA1A21]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Privacidad</p>
                      <p className="text-xs font-bold text-[#EFF4FF]">Tú controlas</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}