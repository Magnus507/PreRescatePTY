"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Battery,
  HeartPulse,
  MousePointer2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";

const trustItems = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "Sin vencimiento por tiempo" },
] as const;

type PersonTone = "red" | "blue" | "navy" | "coral" | "sky";

const personColors: Record<PersonTone, { shirt: string; pants: string; accent: string }> = {
  red: { shirt: "#df2530", pants: "#173a69", accent: "#ff737b" },
  blue: { shirt: "#2f80d0", pants: "#1b3558", accent: "#8dd0ff" },
  navy: { shirt: "#133560", pants: "#0d203c", accent: "#5b8fc5" },
  coral: { shirt: "#f06b63", pants: "#24456e", accent: "#ffb0a8" },
  sky: { shirt: "#6bbbea", pants: "#183d67", accent: "#bde6ff" },
};

function MiniPerson({
  tone,
  flip = false,
  className,
  delay = 0,
}: {
  tone: PersonTone;
  flip?: boolean;
  className: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  const palette = personColors[tone];

  return (
    <motion.div
      aria-hidden="true"
      animate={
        reducedMotion
          ? undefined
          : {
              y: [0, -6, 0],
              rotate: [flip ? 2 : -2, flip ? -1 : 1, flip ? 2 : -2],
            }
      }
      transition={{
        duration: 3.6,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <svg viewBox="0 0 72 132" className="h-full w-full drop-shadow-[0_12px_12px_rgba(20,40,80,.16)]">
        <circle cx="36" cy="18" r="13" fill="#f4c7a5" />
        <path d="M25 13c2-10 21-14 28-1-6-2-9-8-21-3-2 1-5 2-7 4Z" fill="#17233a" />
        <rect x="23" y="31" width="28" height="48" rx="12" fill={palette.shirt} />
        <path d="M23 44c-8 10-11 26-8 37" stroke="#f4c7a5" strokeWidth="8" strokeLinecap="round" />
        <path d="M51 44c8 10 11 26 8 37" stroke="#f4c7a5" strokeWidth="8" strokeLinecap="round" />
        <path d="M29 76l-5 36" stroke={palette.pants} strokeWidth="11" strokeLinecap="round" />
        <path d="M45 76l8 34" stroke={palette.pants} strokeWidth="11" strokeLinecap="round" />
        <path d="M18 114h15" stroke="#11253f" strokeWidth="7" strokeLinecap="round" />
        <path d="M48 113h15" stroke="#11253f" strokeWidth="7" strokeLinecap="round" />
        <rect x="28" y="42" width="17" height="4" rx="2" fill={palette.accent} opacity=".7" />
      </svg>
    </motion.div>
  );
}

function MiniPet({ className, delay = 0 }: { className: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      animate={reducedMotion ? undefined : { y: [0, -4, 0], rotate: [-2, 1, -2] }}
      transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay }}
      className={className}
    >
      <svg viewBox="0 0 100 72" className="h-full w-full drop-shadow-[0_10px_12px_rgba(20,40,80,.16)]">
        <ellipse cx="48" cy="44" rx="28" ry="18" fill="#d99b63" />
        <circle cx="76" cy="32" r="15" fill="#c88752" />
        <path d="M68 19 62 7l14 8ZM83 19 92 8l-1 16Z" fill="#9f683e" />
        <circle cx="81" cy="31" r="2.2" fill="#101828" />
        <path d="M87 37q6 3 8 0" fill="none" stroke="#101828" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 56v12M48 58v10M68 55v12" stroke="#9f683e" strokeWidth="7" strokeLinecap="round" />
        <path d="M21 42q-13-8-10-17" fill="none" stroke="#9f683e" strokeWidth="6" strokeLinecap="round" />
        <rect x="67" y="41" width="20" height="5" rx="2.5" fill="#df2530" />
        <circle cx="77" cy="46" r="4" fill="#f6c84d" />
      </svg>
    </motion.div>
  );
}

function IllustratedWorld() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative aspect-square w-full">
      <div
        aria-hidden="true"
        className="absolute inset-[7%] rounded-full bg-blue-300/30 blur-[55px]"
      />

      <motion.div
        drag="x"
        dragConstraints={{ left: -44, right: 44 }}
        dragElastic={0.08}
        whileTap={{ scale: 0.995 }}
        className="absolute inset-[8%] cursor-grab touch-pan-y overflow-hidden rounded-full border-[10px] border-white/85 bg-[radial-gradient(circle_at_36%_23%,#8ee1ff_0%,#32a9e9_28%,#0f76c8_58%,#0b4d95_79%,#0b356f_100%)] shadow-[0_40px_95px_-35px_rgba(15,83,155,.58),inset_-28px_-24px_55px_rgba(6,36,94,.36),inset_18px_16px_32px_rgba(255,255,255,.26)] active:cursor-grabbing"
        aria-label="Mundo interactivo de PreRescue ID. Puedes arrastrarlo horizontalmente."
      >
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 640 640"
          className="absolute -left-[10%] top-0 h-full w-[120%]"
          animate={reducedMotion ? undefined : { x: ["0%", "-12%", "0%"], rotate: [0, 1.5, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#0b3970" floodOpacity=".24" />
            </filter>
          </defs>

          <g filter="url(#landShadow)">
            <path
              d="M97 173c39-65 118-94 176-65 31 16 47 46 78 49 26 3 49-11 71-2 28 12 43 43 32 68-11 27-41 35-58 57-18 24-18 55-40 74-24 21-59 17-77 41-15 20-10 50-31 64-27 18-59-6-69-34-12-33-6-70-23-99-15-27-46-44-57-75-9-24-4-52-2-78Z"
              fill="#ccecb3"
              stroke="#f8fff4"
              strokeWidth="5"
            />
            <path
              d="M329 118c36-41 99-50 145-26 23 12 41 36 67 42 28 7 57-7 83-1 34 8 58 41 52 73-5 31-33 51-39 80-5 28 12 54 0 79-13 31-51 39-83 34-35-6-69-22-103-14-31 8-53 35-84 39-31 5-65-12-76-39-13-31 3-65 22-91 16-23 36-44 36-72 1-39-35-74-20-104Z"
              fill="#d9f2bf"
              stroke="#f8fff4"
              strokeWidth="5"
            />
            <path
              d="M447 376c26-31 72-39 107-18 18 11 30 30 49 36 17 5 36 0 51 11 19 14 22 40 9 57-12 15-31 21-42 36-11 15-10 35-24 47-20 17-49 8-69 21-17 11-26 34-45 41-21 8-44-4-54-22-12-21-5-47-13-70-7-20-25-36-29-57-5-23 7-46 30-62Z"
              fill="#c6e8a9"
              stroke="#f8fff4"
              strokeWidth="5"
            />
          </g>

          <g fill="#ffffff" fillOpacity=".92">
            <ellipse cx="177" cy="131" rx="68" ry="22" />
            <ellipse cx="238" cy="118" rx="41" ry="15" />
            <ellipse cx="475" cy="155" rx="69" ry="21" />
            <ellipse cx="523" cy="175" rx="45" ry="15" />
            <ellipse cx="442" cy="411" rx="65" ry="19" />
          </g>

          <g fill="#d4e7f4" opacity=".96">
            <path d="M185 201 215 158l24 43Z" />
            <path d="M258 190 288 148l26 42Z" />
            <path d="M474 250 500 213l28 37Z" />
            <path d="M538 281 566 242l27 39Z" />
          </g>
          <g fill="#ffffff" opacity=".98">
            <path d="m204 175 11-17 10 17Z" />
            <path d="m278 163 10-15 11 15Z" />
            <path d="m489 230 11-17 12 17Z" />
            <path d="m552 260 14-18 13 18Z" />
          </g>
        </motion.svg>

        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_20%,rgba(255,255,255,.52),transparent_22%),radial-gradient(circle_at_70%_78%,transparent_49%,rgba(2,34,89,.36)_88%)]"
        />

        <svg aria-hidden="true" viewBox="0 0 600 600" className="absolute inset-0 h-full w-full opacity-[0.13]">
          <circle cx="300" cy="300" r="294" fill="none" stroke="white" strokeWidth="1.5" />
          <ellipse cx="300" cy="300" rx="294" ry="100" fill="none" stroke="white" strokeWidth="1" />
          <ellipse cx="300" cy="300" rx="294" ry="190" fill="none" stroke="white" strokeWidth="1" />
          <ellipse cx="300" cy="300" rx="138" ry="294" fill="none" stroke="white" strokeWidth="1" />
        </svg>
      </motion.div>

      <MiniPerson tone="red" className="absolute left-[19%] top-[3%] z-30 h-[18%] w-[10%]" />
      <MiniPerson tone="blue" flip className="absolute left-[39%] top-[1%] z-30 h-[17%] w-[9%]" delay={0.5} />
      <MiniPerson tone="navy" className="absolute right-[24%] top-[6%] z-30 h-[18%] w-[10%]" delay={0.9} />
      <MiniPerson tone="coral" flip className="absolute right-[8%] top-[22%] z-30 h-[17%] w-[9%]" delay={0.25} />
      <MiniPerson tone="sky" className="absolute left-[9%] top-[27%] z-30 h-[17%] w-[9%]" delay={0.75} />
      <MiniPet className="absolute bottom-[16%] right-[6%] z-30 h-[11%] w-[16%]" delay={0.4} />

      <motion.div
        aria-hidden="true"
        animate={reducedMotion ? undefined : { y: [0, -5, 0], rotate: [-2, 1, -2] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[7%] left-[6%] z-30 rounded-2xl border border-white/90 bg-white/92 px-3 py-2 shadow-[0_18px_45px_-24px_rgba(15,23,42,.38)] backdrop-blur"
      >
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#1b66b2]">
          Más información.
        </p>
        <p className="mt-0.5 text-[10px] font-black text-slate-800">Más cerca.</p>
      </motion.div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#fffdfb] text-slate-950">
      <div
        aria-hidden="true"
        className="absolute -left-44 top-[13%] -z-20 h-[34rem] w-[34rem] rounded-full bg-rose-200/45 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-48 top-[3%] -z-20 h-[44rem] w-[44rem] rounded-full bg-blue-200/70 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-20rem] left-[28%] -z-20 h-[36rem] w-[36rem] rounded-full bg-cyan-100/75 blur-[115px]"
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 1600 950"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        preserveAspectRatio="none"
      >
        <path d="M0 690C245 557 392 545 616 650S1048 826 1600 615V950H0Z" fill="#fff3f3" opacity=".55" />
        <path d="M0 792C310 682 534 710 778 804s491 125 822-13V950H0Z" fill="#edf7ff" opacity=".82" />
        <path d="M1140 65c112 36 218 100 303 211" fill="none" stroke="#2f80d0" strokeWidth="2" strokeDasharray="8 12" opacity=".25" />
        <path d="M246 237c-83 36-145 94-194 173" fill="none" stroke="#df2530" strokeWidth="2" strokeDasharray="8 12" opacity=".2" />
      </svg>

      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1500px] items-center gap-6 px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:grid-cols-[.86fr_1.14fr] lg:gap-1 lg:px-10 xl:px-14">
        <div className="relative z-20 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/84 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.19em] text-[#b3131a] shadow-[0_12px_40px_-28px_rgba(218,26,33,.55)] backdrop-blur-xl sm:mb-7 sm:text-[10px]"
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
            className="max-w-[11.5ch] text-[clamp(3rem,12vw,4.15rem)] font-black leading-[0.87] tracking-[-0.06em] text-[#0a1020] sm:text-[clamp(4.6rem,7vw,7.1rem)]"
          >
            Cuando cada segundo cuenta,
            <span className="mt-2 block bg-gradient-to-r from-[#D91F2A] via-[#ff3d47] to-[#f04b52] bg-clip-text text-transparent">
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
              className="group inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_18px_42px_-18px_rgba(218,26,33,.6)] transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]"
            >
              Ver productos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#recorrido"
              className="group inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/88 px-6 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-xl transition-all active:bg-slate-50 sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:border-blue-200 sm:hover:bg-white"
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
          className="relative mx-auto flex w-full max-w-[790px] items-center justify-center py-5 sm:py-8 lg:py-0"
        >
          <div className="relative w-full">
            <div className="absolute left-[2%] top-[23%] hidden -rotate-[8deg] lg:block">
              <p className="max-w-[120px] text-right text-[13px] font-black italic leading-4 text-[#184f8e]">
                Mantén tu información lista.
              </p>
              <svg aria-hidden="true" viewBox="0 0 110 70" className="ml-auto mt-1 h-12 w-20 text-[#184f8e]">
                <path d="M6 10c33 8 55 26 86 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="m82 48 12 12-17-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="absolute right-[1%] top-[18%] hidden rotate-[8deg] lg:block">
              <p className="max-w-[120px] text-[13px] font-black italic leading-4 text-[#c62832]">
                Personas reales. Ayuda real.
              </p>
              <svg aria-hidden="true" viewBox="0 0 105 75" className="mt-1 h-12 w-20 text-[#c62832]">
                <path d="M96 9C70 21 51 37 21 61" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="m29 50-11 13 17-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <IllustratedWorld />

            <div className="absolute right-[12%] top-[6%] hidden items-center gap-2 rounded-full border border-blue-200/70 bg-white/82 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-blue-700 shadow-sm backdrop-blur sm:flex">
              <MousePointer2 className="h-3.5 w-3.5" />
              Arrastra el mundo
            </div>

            <div className="absolute bottom-[8%] right-[2%] z-30 w-[29%] min-w-[128px] max-w-[205px] rotate-[5deg] overflow-hidden rounded-[1.35rem] border border-white/90 bg-white p-1.5 shadow-[0_24px_70px_-28px_rgba(15,23,42,.46)]">
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
