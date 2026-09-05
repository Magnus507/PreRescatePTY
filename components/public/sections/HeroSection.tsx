"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
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

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#03060c] text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-30 bg-[#03060c]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-70"
        style={{
          background:
            "radial-gradient(70% 70% at 74% 30%, rgba(32,115,255,.20), transparent 55%), radial-gradient(55% 55% at 22% 24%, rgba(7,199,255,.10), transparent 62%), radial-gradient(45% 45% at 64% 86%, rgba(218,26,33,.12), transparent 64%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(to bottom, black, transparent 82%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#03060c] to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-[#03060c] via-[#03060c]/80 to-transparent" />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1500px] items-center px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-10 xl:px-16">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(480px,.98fr)] lg:gap-8 xl:gap-16">
          <div className="relative z-20 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100 shadow-[0_0_30px_-12px_rgba(56,189,248,.8)] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4ff] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4ff]" />
              </span>
              Emergency ID · QR + NFC · Panamá
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="max-w-[14ch] text-[clamp(3.2rem,7.2vw,7.1rem)] font-black leading-[0.86] tracking-[-0.055em] text-[#f7f9ff]"
            >
              Tu información médica.
              <span className="mt-2 block bg-gradient-to-r from-[#86e7ff] via-[#4f9cff] to-[#b7c9ff] bg-clip-text text-transparent">
                Disponible cuando más importa.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="mt-8 max-w-2xl text-base font-medium leading-7 text-slate-300 sm:text-lg sm:leading-8"
            >
              PreRescue ID conecta un sticker físico con un perfil médico de emergencia mediante QR y NFC. Quien lo escanee puede consultar la información que hayas configurado para mostrarse públicamente.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/comprar"
                className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white shadow-[0_18px_48px_-18px_rgba(218,26,33,.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ef2d35] hover:shadow-[0_22px_58px_-16px_rgba(218,26,33,.85)] active:translate-y-0"
              >
                Obtener PreRescue ID
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo"
                className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-7 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.08]"
              >
                <ScanLine className="h-4 w-4 text-sky-300" />
                Ver perfil de demostración
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
              transition={{ delay: 0.52 }}
              className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-slate-500"
            >
              <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              El teléfono que consulta el perfil necesita conexión a internet. El sticker no necesita batería ni conexión propia.
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[700px] lg:mx-0"
          >
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
            <div aria-hidden="true" className="absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-[#DA1A21]/15 blur-[90px]" />

            <div className="relative aspect-[1.03/1] min-h-[520px] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.065] via-white/[0.025] to-transparent p-4 shadow-[0_50px_120px_-55px_rgba(37,99,235,.65)] backdrop-blur-2xl sm:p-7">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 20%, rgba(100,198,255,.10) 44%, transparent 62%), radial-gradient(circle at 80% 20%, rgba(218,26,33,.10), transparent 28%)",
                }}
              />
              <div className="absolute inset-x-6 top-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:inset-x-8 sm:top-7">
                <span>PreRescue / Emergency Profile</span>
                <span className="flex items-center gap-1.5 text-emerald-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> listo
                </span>
              </div>

              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [-2, -1, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[4%] top-[16%] z-20 w-[49%] rounded-[1.85rem] border border-white/10 bg-[#07101f]/90 p-4 shadow-[0_35px_80px_-30px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:left-[8%] sm:w-[47%] sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-sky-200/70">ID físico</span>
                  <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2 py-1 text-[8px] font-bold text-emerald-300">NFC READY</span>
                </div>
                <div className="relative aspect-square overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-br from-[#0b1730] to-[#040711] p-5">
                  <Image
                    src="/sticker-official.png"
                    alt="Sticker oficial PreRescue ID con QR y NFC"
                    fill
                    sizes="(max-width: 768px) 45vw, 320px"
                    priority
                    className="object-contain p-5"
                  />
                  <motion.div
                    aria-hidden="true"
                    animate={reduceMotion ? undefined : { y: ["-20%", "450%"] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: "linear", repeatDelay: 1.1 }}
                    className="absolute inset-x-4 top-4 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_18px_rgba(125,211,252,.95)]"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500">
                  <span>QR + NFC</span>
                  <span>sin batería</span>
                </div>
              </motion.div>

              <motion.div
                animate={reduceMotion ? undefined : { y: [0, 9, 0], rotate: [2, 1, 2] }}
                transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-[7%] right-[3%] z-30 w-[54%] overflow-hidden rounded-[2.2rem] border border-white/[0.11] bg-[#080d16] p-2 shadow-[0_40px_90px_-35px_rgba(0,0,0,.95)] sm:right-[7%] sm:w-[50%]"
              >
                <div className="rounded-[1.75rem] border border-white/[0.06] bg-gradient-to-b from-[#0c1626] to-[#080b12] p-4 sm:p-5">
                  <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/10" />
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20">
                        <HeartPulse className="h-5 w-5 text-[#ff5860]" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Perfil de emergencia</p>
                        <p className="mt-1 text-sm font-extrabold text-white">Información médica</p>
                      </div>
                    </div>
                    <LockKeyhole className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Tipo de sangre", "O+"],
                      ["Alergias", "Visible"],
                      ["Medicamentos", "Visible"],
                      ["Contacto", "Disponible"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-400/10 bg-sky-400/[0.055] p-3 text-[9px] font-semibold text-sky-100/80">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-sky-300" />
                    Solo muestra la información configurada para el perfil público.
                  </div>
                </div>
              </motion.div>

              <div className="absolute bottom-8 left-6 z-10 hidden rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 backdrop-blur-xl sm:block">
                Escanea → consulta → actúa
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
