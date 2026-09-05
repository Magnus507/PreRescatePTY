"use client";

import { useRef } from "react";
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

  return (
    <section
      ref={heroRef}
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#02050a] text-white md:min-h-[128svh]"
    >
      <div className="relative min-h-[100svh] md:sticky md:top-0">
        <div aria-hidden="true" className="absolute inset-0 -z-30 bg-[#02050a]" />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-20 opacity-90"
          style={reduceMotion ? undefined : { y: backgroundY, scale: backgroundScale }}
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
          className="absolute inset-0 -z-20 opacity-[0.17]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "linear-gradient(to bottom, black, transparent 84%)",
          }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#02050a] to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-[#02050a] via-[#02050a]/90 to-transparent" />

        <div className="mx-auto flex min-h-[100svh] w-full max-w-[1540px] items-center px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-10 xl:px-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,.94fr)_minmax(520px,1.06fr)] lg:gap-8 xl:gap-14">
            <motion.div
              style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
              className="relative z-20 max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100 shadow-[0_0_34px_-14px_rgba(56,189,248,.9)] backdrop-blur-xl sm:text-[11px]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4ff] opacity-45" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4ff]" />
                </span>
                Emergency ID · QR + NFC · Panamá
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.72, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[13ch] text-[clamp(3.25rem,7vw,7rem)] font-black leading-[0.86] tracking-[-0.058em] text-[#f7f9ff]"
              >
                Tu información médica.
                <span className="mt-2 block bg-gradient-to-r from-[#8ce9ff] via-[#4f9cff] to-[#c5d4ff] bg-clip-text text-transparent">
                  Disponible cuando más importa.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.15 }}
                className="mt-8 max-w-2xl text-base font-medium leading-7 text-slate-300 sm:text-lg sm:leading-8"
              >
                Un identificador físico con QR + NFC conectado a tu perfil médico de emergencia. Sin aplicación, sin batería y con la información pública bajo tu control.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.24 }}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href="/comprar"
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white shadow-[0_18px_50px_-18px_rgba(218,26,33,.78)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ef2d35] hover:shadow-[0_24px_64px_-16px_rgba(218,26,33,.86)] active:translate-y-0"
                >
                  Obtener PreRescue ID
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/demo"
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-7 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.08]"
                >
                  <ScanLine className="h-4 w-4 text-sky-300" />
                  Ver demo
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.38 }}
                className="mt-9 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/[0.07] pt-6"
              >
                {trustItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <item.icon className="h-4 w-4 text-emerald-400" />
                    {item.label}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-slate-500"
              >
                <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                El teléfono que consulta el perfil necesita internet. El sticker no necesita batería ni conexión propia.
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              style={reduceMotion ? undefined : { y: stageY, scale: stageScale, rotate: stageRotate }}
              className="relative mx-auto w-full max-w-[760px] lg:mx-0"
            >
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[110px]" />
              <div aria-hidden="true" className="absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-[#DA1A21]/15 blur-[95px]" />

              <div className="relative aspect-[1.04/1] min-h-[520px] overflow-hidden rounded-[2.1rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.075] via-white/[0.026] to-transparent p-4 shadow-[0_54px_140px_-60px_rgba(37,99,235,.72)] backdrop-blur-2xl sm:min-h-[590px] sm:p-7">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-45"
                  style={{
                    background:
                      "linear-gradient(120deg, transparent 18%, rgba(100,198,255,.11) 43%, transparent 63%), radial-gradient(circle at 80% 20%, rgba(218,26,33,.11), transparent 28%)",
                  }}
                />
                <div aria-hidden="true" className="absolute inset-x-16 top-[49%] h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />
                <div aria-hidden="true" className="absolute left-[49%] top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

                <div className="absolute inset-x-6 top-5 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:inset-x-8 sm:top-7 sm:text-[10px]">
                  <span>PreRescue / Emergency Flow</span>
                  <span className="flex items-center gap-1.5 text-emerald-300/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.8)]" /> listo
                  </span>
                </div>

                <motion.div
                  style={reduceMotion ? undefined : { x: stickerX, y: stickerY }}
                  animate={reduceMotion ? undefined : { rotate: [-2.4, -1.5, -2.4] }}
                  transition={{ duration: 6.3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-[3%] top-[17%] z-20 w-[49%] rounded-[1.9rem] border border-white/10 bg-[#07101f]/92 p-4 shadow-[0_38px_90px_-34px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:left-[7%] sm:w-[46%] sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-sky-200/70 sm:text-[9px]">ID físico</span>
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2 py-1 text-[7px] font-bold text-emerald-300 sm:text-[8px]">NFC READY</span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-br from-[#0b1730] to-[#040711] p-4 sm:p-5">
                    <Image
                      src="/sticker-official.png"
                      alt="Sticker oficial PreRescue ID con QR y NFC"
                      fill
                      sizes="(max-width: 768px) 46vw, 330px"
                      priority
                      className="object-contain p-4 sm:p-5"
                    />
                    <motion.div
                      aria-hidden="true"
                      animate={reduceMotion ? undefined : { y: ["-20%", "460%"] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
                      className="absolute inset-x-4 top-4 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_20px_rgba(125,211,252,.95)]"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[8px] text-slate-500 sm:text-[9px]">
                    <span>QR + NFC</span>
                    <span>sin batería</span>
                  </div>
                </motion.div>

                <motion.div
                  style={reduceMotion ? undefined : { x: phoneX, y: phoneY }}
                  animate={reduceMotion ? undefined : { rotate: [2.2, 1.2, 2.2] }}
                  transition={{ duration: 6.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  className="absolute bottom-[7%] right-[2%] z-30 w-[56%] overflow-hidden rounded-[2.25rem] border border-white/[0.11] bg-[#080d16] p-2 shadow-[0_44px_100px_-38px_rgba(0,0,0,.98)] sm:right-[6%] sm:w-[50%]"
                >
                  <div className="rounded-[1.8rem] border border-white/[0.06] bg-gradient-to-b from-[#0c1626] to-[#080b12] p-4 sm:p-5">
                    <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/10" />
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20 sm:h-11 sm:w-11">
                          <HeartPulse className="h-5 w-5 text-[#ff5860]" />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-[9px]">Perfil de emergencia</p>
                          <p className="mt-1 text-xs font-extrabold text-white sm:text-sm">Información médica</p>
                        </div>
                      </div>
                      <LockKeyhole className="h-4 w-4 shrink-0 text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Tipo de sangre", "O+"],
                        ["Alergias", "Visible"],
                        ["Medicamentos", "Visible"],
                        ["Contacto", "Disponible"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5 sm:p-3">
                          <p className="text-[7px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[8px]">{label}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-100 sm:text-[11px]">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-400/10 bg-sky-400/[0.055] p-3 text-[8px] font-semibold text-sky-100/80 sm:text-[9px]">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-sky-300" />
                      Solo muestra la información configurada como pública.
                    </div>
                  </div>
                </motion.div>

                <div className="absolute bottom-7 left-5 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400 backdrop-blur-xl sm:flex">
                  <ScanLine className="h-3.5 w-3.5 text-sky-300" />
                  Escanea → consulta → actúa
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5 px-1 sm:gap-2">
                {flow.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.065] bg-white/[0.025] px-2 py-2.5 text-center"
                  >
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-sky-300/65 sm:text-[8px]">0{index + 1}</p>
                    <p className="mt-1 truncate text-[8px] font-bold text-slate-500 sm:text-[9px]">{item}</p>
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
