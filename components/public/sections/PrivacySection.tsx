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
    <section className="relative overflow-hidden bg-[#050914] py-24 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 52% at 20% 30%, rgba(16,185,129,.08), transparent 62%), radial-gradient(44% 52% at 86% 74%, rgba(37,99,235,.10), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.62 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacidad por diseño
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
              Tú decides qué puede verse.
            </h2>
            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
              El perfil de emergencia debe ser útil sin convertir tu cuenta completa en información pública. Por eso la vista pública está separada de los datos internos de la cuenta.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {controls.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <item.icon className="h-4 w-4 text-emerald-300" />
                  <h3 className="mt-3 text-sm font-extrabold text-slate-100">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>

            <Link
              href="/legal/privacidad"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-200 transition-colors hover:text-white"
            >
              Conocer la política de privacidad
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="relative"
          >
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_45px_110px_-60px_rgba(16,185,129,.55)] backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06]">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Panel de privacidad</p>
                    <p className="mt-0.5 text-sm font-extrabold text-slate-100">Qué ve una persona al escanear</p>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.055] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">configurable</div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-sky-300/10 bg-sky-300/[0.035] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-200">Visible</span>
                    <Eye className="h-4 w-4 text-sky-300" />
                  </div>
                  <div className="space-y-2.5">
                    {publicItems.map((item) => (
                      <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-3">
                        <span className="text-[11px] font-semibold text-slate-300">{item}</span>
                        <span className="flex h-5 w-9 shrink-0 items-center rounded-full bg-sky-400/70 p-0.5"><span className="ml-auto h-4 w-4 rounded-full bg-white shadow" /></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/[0.07] bg-black/20 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">No público</span>
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="space-y-2.5">
                    {privateItems.map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3">
                        <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span className="text-[11px] font-semibold text-slate-500">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3">
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
