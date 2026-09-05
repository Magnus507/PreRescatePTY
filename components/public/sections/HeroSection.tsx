"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Battery,
  HeartPulse,
  LockKeyhole,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";

const trustItems = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sticker sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "2 años desde activación" },
];

const flow = ["ID físico", "Escaneo", "Perfil", "Contacto"];

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.35,
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const stageY = useTransform(progress, [0, 1], [0, -72]);
  const stageScale = useTransform(progress, [0, 1], [1, 0.92]);
  const stageRotate = useTransform(progress, [0, 1], [0, -1.8]);
  const stickerX = useTransform(progress, [0, 1], [0, 68]);
  const stickerY = useTransform(progress, [0, 1], [0, -26]);
  const phoneX = useTransform(progress, [0, 1], [0, -42]);
  const phoneY = useTransform(progress, [0, 1], [0, 22]);
  const copyY = useTransform(progress, [0, 1], [0, -34]);
  const copyOpacity = useTransform(progress, [0, 0.72, 1], [1, 0.96, 0.56]);
  const backgroundY = useTransform(progress, [0, 1], [0, 42]);
  const backgroundScale = useTransform(progress, [0, 1], [1, 1.05]);

  const ambientMotion = !reduceMotion && !isMobile;

  return (
    <section
      ref={heroRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#02050a] text-white md:min-h-[128svh]"
    >
      <div className="relative md:min-h-[100svh] md:sticky md:top-0">
        <div aria-hidden="true" className="absolute inset-0 -z-30 bg-[#02050a]" />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-20 opacity-85 sm:opacity-90"
          style={ambientMotion ? { y: backgroundY, scale: backgroundScale } : undefined}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(62% 62% at 76% 30%, rgba(32,115,255,.24), transparent 56%), radial-gradient(46% 48% at 18% 28%, rgba(17,205,255,.11), transparent 62%), radial-gradient(42% 48% at 68% 88%, rgba(218,26,33,.13), transparent 66%)",
            }}
          />
        </motion.div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 opacity-[0.10] sm:opacity-[0.17]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "linear-gradient(to bottom, black, transparent 84%)",
          }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-[#02050a] to-transparent sm:h-40" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[#02050a] via-[#02050a]/90 to-transparent sm:h-56" />

        <div className="mx-auto flex w-full max-w-[1540px] items-center px-4 pb-14 pt-24 sm:min-h-[100svh] sm:px-6 sm:pb-20 sm:pt-28 md:pt-32 lg:px-10 xl:px-16">
          <div className="grid w-full items-center gap-8 sm:gap-12 lg:grid-cols-[minmax(0,.94fr)_minmax(520px,1.06fr)] lg:gap-8 xl:gap-14">
            <motion.div
              style={ambientMotion ? { y: copyY, opacity: copyOpacity } : undefined}
              className="relative z-20 max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_30px_-15px_rgba(56,189,248,.9)] backdrop-blur-xl sm:mb-7 sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-[0.2em]"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4ff] opacity-45" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4ff]" />
                </span>
                <span className="truncate">Emergency ID · QR + NFC · Panamá</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.62, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[13ch] text-[clamp(2.7rem,12vw,3.35rem)] font-black leading-[0.9] tracking-[-0.052em] text-[#f7f9ff] sm:text-[clamp(3.25rem,7vw,7rem)] sm:leading-[0.86] sm:tracking-[-0.058em]"
              >
                Tu información médica.
                <span className="mt-1.5 block bg-gradient-to-r from-[#8ce9ff] via-[#4f9cff] to-[#c5d4ff] bg-clip-text text-transparent sm:mt-2">
                  Disponible cuando más importa.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-300 sm:mt-8 sm:text-lg sm:leading-8"
              >
                Un identificador físico con QR + NFC conectado a tu perfil médico de emergencia. Sin aplicación, sin batería y con la información pública bajo tu control.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
                className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3"
              >
                <Link
                  href="/comprar"
                  className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-extrabold text-white shadow-[0_18px_50px_-18px_rgba(218,26,33,.78)] transition-all duration-300 active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35] sm:hover:shadow-[0_24px_64px_-16px_rgba(218,26,33,.86)]"
                >
                  Obtener PreRescue ID
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/demo"
                  className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all duration-300 active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:border-sky-300/30 sm:hover:bg-white/[0.08]"
                >
                  <ScanLine className="h-4 w-4 text-sky-300" />
                  Ver demo
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-7 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-white/[0.07] pt-5 sm:mt-9 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3 sm:pt-6"
              >
                {trustItems.map((item) => (
                  <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-slate-400 sm:text-xs">
                    <item.icon className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="leading-4">{item.label}</span>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex items-start gap-2 text-[10px] leading-4.5 text-slate-500 sm:mt-5 sm:text-[11px] sm:leading-5"
              >
                <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                El teléfono que consulta el perfil necesita internet. El sticker no necesita batería ni conexión propia.
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={ambientMotion ? { y: stageY, scale: stageScale, rotate: stageRotate } : undefined}
              className="relative mx-auto w-full max-w-[760px] lg:mx-0"
            >
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-[72px] sm:h-[72%] sm:w-[72%] sm:bg-blue-500/20 sm:blur-[110px]" />
              <div aria-hidden="true" className="absolute -right-5 bottom-8 h-32 w-32 rounded-full bg-[#DA1A21]/10 blur-[65px] sm:-right-10 sm:bottom-10 sm:h-52 sm:w-52 sm:bg-[#DA1A21]/15 sm:blur-[95px]" />

              <div className="relative aspect-[1.04/1] min-h-[410px] overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.075] via-white/[0.026] to-transparent p-3 shadow-[0_42px_100px_-50px_rgba(37,99,235,.65)] backdrop-blur-xl sm:min-h-[590px] sm:rounded-[2.1rem] sm:p-7 sm:shadow-[0_54px_140px_-60px_rgba(37,99,235,.72)] sm:backdrop-blur-2xl">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-35 sm:opacity-45"
                  style={{
                    background:
                      "linear-gradient(120deg, transparent 18%, rgba(100,198,255,.11) 43%, transparent 63%), radial-gradient(circle at 80% 20%, rgba(218,26,33,.11), transparent 28%)",
                  }}
                />
                <div aria-hidden="true" className="absolute inset-x-12 top-[49%] h-px bg-gradient-to-r from-transparent via-sky-300/25 to-transparent sm:inset-x-16 sm:via-sky-300/35" />
                <div aria-hidden="true" className="absolute bottom-14 left-[49%] top-16 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent sm:bottom-20 sm:top-20 sm:via-white/[0.08]" />

                <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 text-[7px] font-black uppercase tracking-[0.14em] text-slate-500 sm:inset-x-8 sm:top-7 sm:text-[10px] sm:tracking-[0.2em]">
                  <span className="truncate">PreRescue / Emergency Flow</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-emerald-300/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.8)]" /> listo
                  </span>
                </div>

                <motion.div
                  style={ambientMotion ? { x: stickerX, y: stickerY } : undefined}
                  animate={ambientMotion ? { rotate: [-2.4, -1.5, -2.4] } : undefined}
                  transition={{ duration: 6.3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-[2%] top-[16%] z-20 w-[50%] rounded-[1.4rem] border border-white/10 bg-[#07101f]/92 p-2.5 shadow-[0_30px_75px_-34px_rgba(0,0,0,.98)] backdrop-blur-xl sm:left-[7%] sm:top-[17%] sm:w-[46%] sm:rounded-[1.9rem] sm:p-5 sm:shadow-[0_38px_90px_-34px_rgba(0,0,0,.98)] sm:backdrop-blur-2xl"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                    <span className="text-[7px] font-extrabold uppercase tracking-[0.14em] text-sky-200/70 sm:text-[9px] sm:tracking-[0.18em]">ID físico</span>
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-1.5 py-0.5 text-[6px] font-bold text-emerald-300 sm:px-2 sm:py-1 sm:text-[8px]">NFC READY</span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-[1rem] border border-white/[0.07] bg-gradient-to-br from-[#0b1730] to-[#040711] p-2 sm:rounded-[1.35rem] sm:p-5">
                    <Image
                      src="/sticker-official.png"
                      alt="Sticker oficial PreRescue ID con QR y NFC"
                      fill
                      sizes="(max-width: 768px) 48vw, 330px"
                      priority
                      className="object-contain p-2.5 sm:p-5"
                    />
                    {ambientMotion && (
                      <motion.div
                        aria-hidden="true"
                        animate={{ y: ["-20%", "460%"] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
                        className="absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_20px_rgba(125,211,252,.95)] sm:inset-x-4 sm:top-4"
                      />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[7px] text-slate-500 sm:mt-3 sm:text-[9px]">
                    <span>QR + NFC</span>
                    <span>sin batería</span>
                  </div>
                </motion.div>

                <motion.div
                  style={ambientMotion ? { x: phoneX, y: phoneY } : undefined}
                  animate={ambientMotion ? { rotate: [2.2, 1.2, 2.2] } : undefined}
                  transition={{ duration: 6.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  className="absolute bottom-[5%] right-[1%] z-30 w-[59%] overflow-hidden rounded-[1.7rem] border border-white/[0.11] bg-[#080d16] p-1.5 shadow-[0_36px_80px_-34px_rgba(0,0,0,.98)] sm:bottom-[7%] sm:right-[6%] sm:w-[50%] sm:rounded-[2.25rem] sm:p-2 sm:shadow-[0_44px_100px_-38px_rgba(0,0,0,.98)]"
                >
                  <div className="rounded-[1.35rem] border border-white/[0.06] bg-gradient-to-b from-[#0c1626] to-[#080b12] p-3 sm:rounded-[1.8rem] sm:p-5">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10 sm:mb-5 sm:h-1.5 sm:w-14" />
                    <div className="mb-3 flex items-start justify-between gap-2 sm:mb-5 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20 sm:h-11 sm:w-11 sm:rounded-2xl">
                          <HeartPulse className="h-4 w-4 text-[#ff5860] sm:h-5 sm:w-5" />
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[9px] sm:tracking-[0.16em]">Perfil de emergencia</p>
                          <p className="mt-0.5 text-[11px] font-extrabold text-white sm:mt-1 sm:text-sm">Información médica</p>
                        </div>
                      </div>
                      <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {[
                        ["Tipo de sangre", "O+"],
                        ["Alergias", "Visible"],
                        ["Medicamentos", "Visible"],
                        ["Contacto", "Disponible"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.035] p-2 sm:rounded-xl sm:p-3">
                          <p className="truncate text-[6px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[8px]">{label}</p>
                          <p className="mt-0.5 text-[8px] font-bold text-slate-100 sm:mt-1 sm:text-[11px]">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-sky-400/10 bg-sky-400/[0.055] p-2 text-[7px] font-semibold leading-3.5 text-sky-100/80 sm:mt-3 sm:gap-2 sm:rounded-xl sm:p-3 sm:text-[9px] sm:leading-normal">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-300 sm:h-4 sm:w-4" />
                      Solo muestra la información configurada como pública.
                    </div>
                  </div>
                </motion.div>

                <div className="absolute bottom-7 left-5 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400 backdrop-blur-xl sm:flex">
                  <ScanLine className="h-3.5 w-3.5 text-sky-300" />
                  Escanea → consulta → actúa
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-1 px-0.5 sm:mt-3 sm:gap-2 sm:px-1">
                {flow.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/[0.065] bg-white/[0.025] px-1.5 py-2 text-center sm:rounded-xl sm:px-2 sm:py-2.5"
                  >
                    <p className="text-[6px] font-black uppercase tracking-[0.12em] text-sky-300/65 sm:text-[8px] sm:tracking-[0.14em]">0{index + 1}</p>
                    <p className="mt-0.5 truncate text-[7px] font-bold text-slate-500 sm:mt-1 sm:text-[9px]">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-600 md:flex"
        >
          <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
          Descubre el flujo
        </motion.div>
      </div>
    </section>
  );
}
