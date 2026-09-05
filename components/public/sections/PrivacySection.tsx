"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";

const controls = [
  { icon: Eye, title: "Visibilidad configurable", text: "Decide qué información del perfil estará disponible públicamente." },
  { icon: LockKeyhole, title: "Controles de seguridad", text: "Aplicamos cifrado y controles de acceso a datos sensibles." },
  { icon: EyeOff, title: "Datos de cuenta fuera del perfil público", text: "El correo de cuenta y la fecha de nacimiento completa no forman parte de la vista pública." },
  { icon: Trash2, title: "Eliminación disponible", text: "Puedes solicitar la eliminación de tu cuenta mediante el flujo de confirmación disponible." },
];

const publicItems = ["Nombre visible", "Tipo de sangre", "Alergias", "Condiciones", "Contacto de emergencia"];
const privateItems = ["Correo de la cuenta", "Fecha de nacimiento completa", "Información interna de acceso"];

export default function PrivacySection() {
  return (
    <section className="relative overflow-hidden bg-[#050914] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 52% at 20% 30%, rgba(16,185,129,.08), transparent 62%), radial-gradient(44% 52% at 86% 74%, rgba(37,99,235,.10), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-200 sm:mb-6 sm:text-[10px] sm:tracking-[0.18em]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacidad por diseño
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
              Tú decides qué puede verse.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
              El perfil de emergencia debe ser útil sin convertir tu cuenta completa en información pública. Por eso la vista pública está separada de los datos internos de la cuenta.
            </p>

            <div className="mt-7 grid gap-2.5 sm:mt-9 sm:grid-cols-2 sm:gap-3">
              {controls.map((item) => (
                <div key={item.title} className="rounded-[1.1rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:rounded-2xl">
                  <item.icon className="h-4 w-4 text-emerald-300" />
                  <h3 className="mt-2.5 text-sm font-extrabold text-slate-100 sm:mt-3">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-1.5">{item.text}</p>
                </div>
              ))}
            </div>

            <Link
              href="/legal/privacidad"
              className="group mt-6 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-emerald-200 transition-colors active:text-white sm:mt-8 sm:hover:text-white"
            >
              Conocer la política de privacidad
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="relative"
          >
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.08] blur-[75px] sm:h-[76%] sm:w-[76%] sm:bg-emerald-500/10 sm:blur-[100px]" />
            <div className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_38px_95px_-58px_rgba(16,185,129,.5)] backdrop-blur-xl sm:rounded-[2rem] sm:p-7 sm:shadow-[0_45px_110px_-60px_rgba(16,185,129,.55)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4 sm:pb-5">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] sm:h-10 sm:w-10 sm:rounded-2xl">
                    <ShieldCheck className="h-[18px] w-[18px] text-emerald-300 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[9px] sm:tracking-[0.16em]">Panel de privacidad</p>
                    <p className="mt-0.5 truncate text-[12px] font-extrabold text-slate-100 sm:text-sm">Qué ve una persona al escanear</p>
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-emerald-300/10 bg-emerald-300/[0.055] px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-emerald-300 sm:px-3 sm:py-1.5 sm:text-[9px]">configurable</div>
              </div>

              <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-sky-300/10 bg-sky-300/[0.035] p-4 sm:rounded-[1.5rem] sm:p-5">
                  <div className="mb-4 flex items-center justify-between sm:mb-5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-sky-200 sm:text-[10px] sm:tracking-[0.16em]">Visible</span>
                    <Eye className="h-4 w-4 text-sky-300" />
                  </div>
                  <div className="space-y-2">
                    {publicItems.map((item) => (
                      <div key={item} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2.5 sm:py-3">
                        <span className="text-[11px] font-semibold text-slate-300">{item}</span>
                        <span className="flex h-5 w-9 shrink-0 items-center rounded-full bg-sky-400/70 p-0.5"><span className="ml-auto h-4 w-4 rounded-full bg-white shadow" /></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/[0.07] bg-black/20 p-4 sm:rounded-[1.5rem] sm:p-5">
                  <div className="mb-4 flex items-center justify-between sm:mb-5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px] sm:tracking-[0.16em]">No público</span>
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    {privateItems.map((item) => (
                      <div key={item} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 sm:py-3">
                        <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-500">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3 sm:mt-5">
                    <div className="flex items-start gap-2 text-[10px] leading-5 text-emerald-100/70"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />La configuración pública no convierte los datos internos de la cuenta en información pública.</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
