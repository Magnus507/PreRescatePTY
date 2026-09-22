"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Battery,
  HeartPulse,
  MousePointer2,
  PawPrint,
  QrCode,
  ShieldCheck,
  Smartphone,
  User,
  Wifi,
} from "lucide-react";

const trustItems = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "Sin vencimiento por tiempo" },
];

function WorldSurface() {
  return (
    <svg
      viewBox="0 0 900 430"
      aria-hidden="true"
      className="h-full w-1/2 shrink-0"
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="#dff5ce" stroke="#ffffff" strokeOpacity=".28" strokeWidth="2">
        <path d="M55 160c36-58 107-89 167-68 29 10 43 31 70 34 21 2 43-7 63 1 26 10 39 38 30 61-8 22-33 28-48 45-17 19-18 48-37 64-20 17-49 14-65 33-13 16-11 42-29 53-22 14-48-6-57-29-10-27-5-58-18-84-12-24-38-39-48-64-7-17-4-32 2-46z" />
        <path d="M362 93c33-33 88-37 128-14 16 10 28 27 47 31 21 5 42-6 63-3 28 4 49 30 46 56-3 24-25 41-29 64-3 22 12 43 4 64-9 24-39 31-64 28-28-4-55-16-82-9-25 6-43 28-68 32-24 4-51-9-60-31-10-25 3-52 18-73 13-18 28-35 28-58 0-31-28-58-31-87z" />
        <path d="M632 158c29-38 83-52 126-32 21 10 35 31 57 37 18 5 38-1 54 9 21 13 26 42 13 62-11 18-32 26-43 44-10 17-9 39-24 52-20 18-52 10-73 25-18 13-26 38-47 45-21 7-45-5-55-24-13-24-5-53-13-79-7-23-27-42-31-66-5-26 8-52 36-73z" />
        <path d="M714 310c19-14 45-13 64 0 18 13 28 37 20 57-9 22-36 34-59 28-25-6-44-32-39-56 2-12 7-22 14-29z" />
      </g>
      <g fill="#ffffff" fillOpacity=".64">
        <ellipse cx="176" cy="108" rx="76" ry="24" />
        <ellipse cx="514" cy="74" rx="62" ry="19" />
        <ellipse cx="709" cy="216" rx="71" ry="21" />
        <ellipse cx="334" cy="296" rx="58" ry="18" />
      </g>
    </svg>
  );
}

function GlobeLines() {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 600" className="absolute inset-0 h-full w-full opacity-25">
      <circle cx="300" cy="300" r="294" fill="none" stroke="white" strokeWidth="1.5" />
      <ellipse cx="300" cy="300" rx="294" ry="86" fill="none" stroke="white" strokeWidth="1" />
      <ellipse cx="300" cy="300" rx="294" ry="174" fill="none" stroke="white" strokeWidth="1" />
      <ellipse cx="300" cy="300" rx="116" ry="294" fill="none" stroke="white" strokeWidth="1" />
      <ellipse cx="300" cy="300" rx="220" ry="294" fill="none" stroke="white" strokeWidth="1" />
    </svg>
  );
}

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#fbfcff] text-slate-950">
      <div
        aria-hidden="true"
        className="absolute -left-36 top-[18%] -z-20 h-[34rem] w-[34rem] rounded-full bg-rose-200/45 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-44 top-[4%] -z-20 h-[42rem] w-[42rem] rounded-full bg-blue-200/65 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-18rem] left-[30%] -z-20 h-[34rem] w-[34rem] rounded-full bg-cyan-100/70 blur-[110px]"
      />

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { rotate: [0, 6, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-[18%] top-[8%] -z-10 h-[72vw] max-h-[980px] min-h-[580px] w-[72vw] min-w-[580px] rounded-full border-[42px] border-blue-100/55"
      />
      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { rotate: [0, -8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-[30%] bottom-[-58%] -z-10 h-[74vw] w-[74vw] min-w-[680px] rounded-full border-[38px] border-rose-100/70"
      />

      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1500px] items-center gap-8 px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-[.88fr_1.12fr] lg:gap-6 lg:px-10 xl:px-14">
        <div className="relative z-20 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.19em] text-[#b3131a] shadow-[0_12px_40px_-28px_rgba(218,26,33,.6)] backdrop-blur-xl sm:mb-7 sm:text-[10px]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DA1A21] opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DA1A21]" />
            </span>
            Información lista cuando importa
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.66, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[12ch] text-[clamp(3rem,12vw,4rem)] font-black leading-[0.88] tracking-[-0.06em] text-[#0a1020] sm:text-[clamp(4.4rem,7vw,7rem)]"
          >
            Cuando cada segundo cuenta,
            <span className="mt-2 block bg-gradient-to-r from-[#DA1A21] via-[#ff3540] to-[#ef4444] bg-clip-text text-transparent">
              tu información debe estar cerca.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:mt-8 sm:text-lg sm:leading-8"
          >
            PreRescue ID conecta una identificación física con QR + NFC a la
            información pública que tú decides mostrar, para facilitar una consulta
            rápida desde cualquier navegador compatible.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row"
          >
            <Link
              href="/comprar"
              className="group inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_18px_42px_-18px_rgba(218,26,33,.65)] transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]"
            >
              Ver productos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#recorrido"
              className="group inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-6 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-xl transition-all active:bg-slate-50 sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:border-blue-200 sm:hover:bg-white"
            >
              <HeartPulse className="h-4 w-4 text-[#DA1A21]" />
              Cómo funciona
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-7 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-5 sm:mt-9 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3 sm:pt-6"
          >
            {trustItems.map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-500 sm:text-xs">
                <item.icon className="h-4 w-4 shrink-0 text-[#0d72c9]" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>

          <div className="mt-4 flex items-start gap-2 text-[10px] leading-[18px] text-slate-400 sm:mt-5 sm:text-[11px] sm:leading-5">
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            El teléfono que consulta el perfil necesita internet. El identificador
            NFC pasivo no necesita batería ni conexión propia.
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex w-full max-w-[760px] items-center justify-center py-5 sm:py-8 lg:py-0"
        >
          <div className="relative aspect-square w-full max-w-[620px]">
            <div
              aria-hidden="true"
              className="absolute inset-[9%] rounded-full bg-blue-500/20 blur-[55px]"
            />

            <motion.div
              drag="x"
              dragConstraints={{ left: -72, right: 72 }}
              dragElastic={0.08}
              whileTap={{ scale: 0.995 }}
              className="absolute inset-[7%] cursor-grab touch-pan-y overflow-hidden rounded-full bg-[radial-gradient(circle_at_34%_26%,#66c6ff_0%,#0c7bcc_28%,#04518e_56%,#06284f_78%,#07182f_100%)] shadow-[0_55px_110px_-45px_rgba(9,72,130,.75),inset_-35px_-30px_70px_rgba(0,15,45,.45),inset_20px_20px_35px_rgba(255,255,255,.20)] active:cursor-grabbing"
              aria-label="Globo interactivo. Arrastra horizontalmente para moverlo."
            >
              <motion.div
                className="absolute -inset-y-[2%] left-[-3%] flex w-[206%]"
                animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <WorldSurface />
                <WorldSurface />
              </motion.div>
              <GlobeLines />
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_21%,rgba(255,255,255,.42),transparent_20%),radial-gradient(circle_at_65%_76%,transparent_45%,rgba(2,14,35,.55)_85%)]"
              />
            </motion.div>

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -9, 0], rotate: [-1.5, 1.5, -1.5] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[8%] top-[17%] z-20 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_20px_55px_-25px_rgba(15,23,42,.45)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-500">Personas</p>
                  <p className="text-[11px] font-black text-slate-800">Información cerca</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
              className="absolute right-[2%] top-[31%] z-20 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_20px_55px_-25px_rgba(15,23,42,.45)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#DA1A21]">
                  <HeartPulse className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-rose-500">Emergencia</p>
                  <p className="text-[11px] font-black text-slate-800">QR + NFC</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -6, 0], x: [0, 5, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute bottom-[13%] left-[12%] z-20 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_20px_55px_-25px_rgba(15,23,42,.45)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <PawPrint className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-600">Mascotas</p>
                  <p className="text-[11px] font-black text-slate-800">Retorno seguro</p>
                </div>
              </div>
            </motion.div>

            <div className="absolute bottom-[7%] right-[2%] z-20 w-[33%] min-w-[132px] max-w-[205px] rotate-[7deg] overflow-hidden rounded-[1.4rem] border border-white/90 bg-white p-1.5 shadow-[0_24px_70px_-28px_rgba(15,23,42,.48)]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem]">
                <Image
                  src="/media/sticker-emergency.avif"
                  alt="Sticker PreRescue ID"
                  fill
                  sizes="205px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="absolute right-[9%] top-[6%] z-20 hidden items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-blue-700 shadow-sm backdrop-blur sm:flex">
              <MousePointer2 className="h-3.5 w-3.5" />
              Arrastra el mundo
            </div>

            <svg
              aria-hidden="true"
              viewBox="0 0 700 700"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <path
                d="M102 467 C46 380, 46 263, 116 168"
                fill="none"
                stroke="#DA1A21"
                strokeWidth="2"
                strokeDasharray="7 13"
                opacity=".32"
              />
              <path
                d="M566 146 C646 216, 666 334, 612 429"
                fill="none"
                stroke="#1d75d0"
                strokeWidth="2"
                strokeDasharray="7 13"
                opacity=".34"
              />
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
