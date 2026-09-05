"use client";

import { motion } from "framer-motion";
import { Battery, Fingerprint, LockKeyhole, QrCode, ScanLine, Smartphone, Wifi } from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";

const features = [
  {
    icon: QrCode,
    title: "QR + NFC en una sola identificación",
    description: "Dos formas rápidas de abrir el mismo perfil de emergencia desde un dispositivo compatible.",
    glowColor: "blue" as const,
    accent: "text-sky-300",
  },
  {
    icon: Smartphone,
    title: "Sin instalar aplicaciones",
    description: "El perfil se consulta directamente desde el navegador. Menos fricción cuando cada segundo cuenta.",
    glowColor: "purple" as const,
    accent: "text-indigo-300",
  },
  {
    icon: LockKeyhole,
    title: "Visibilidad configurable",
    description: "Puedes decidir qué datos del perfil están disponibles públicamente y mantener datos de cuenta fuera de la vista pública.",
    glowColor: "green" as const,
    accent: "text-emerald-300",
  },
  {
    icon: Battery,
    title: "El sticker no usa batería",
    description: "El identificador físico no necesita cargarse ni conectarse a una red. El teléfono que consulta sí necesita internet.",
    glowColor: "red" as const,
    accent: "text-rose-300",
  },
];

export default function WhatIsSection() {
  return (
    <section className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(60% 55% at 20% 25%, rgba(14,165,233,.10), transparent 60%), radial-gradient(50% 55% at 84% 72%, rgba(79,70,229,.09), transparent 62%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 sm:gap-8 lg:grid-cols-[1fr_.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300/80 sm:mb-5 sm:text-xs sm:tracking-[0.2em]">Qué es PreRescue ID</p>
            <h2 className="max-w-[12ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.6rem,5vw,5rem)] sm:leading-[0.92]">
              Una identidad médica física conectada a tu perfil digital.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="lg:pb-2"
          >
            <p className="max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-8">
              El objetivo es simple: que información médica relevante y contactos de emergencia puedan consultarse rápidamente mediante un sticker con QR y NFC, sin depender de una aplicación instalada.
            </p>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-3 sm:mt-16 sm:gap-4 md:grid-cols-2 xl:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="xl:col-span-5"
          >
            <GlowCard customSize glowColor="blue" className="h-full min-h-[340px] p-5 sm:min-h-[430px] sm:p-9">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="mb-6 flex items-center justify-between sm:mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-sky-200 sm:text-[10px] sm:tracking-[0.16em]">
                      <ScanLine className="h-3.5 w-3.5" />
                      Flujo de emergencia
                    </div>
                    <Fingerprint className="h-5 w-5 text-sky-300/60 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="max-w-[9ch] text-[2rem] font-black leading-[0.96] tracking-[-0.04em] text-white sm:text-5xl">
                    Escanear. Consultar. Actuar.
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-6 text-slate-400 sm:mt-5 sm:text-base">
                    El perfil se abre desde el navegador y presenta la información configurada para la consulta pública.
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-1.5 sm:mt-10 sm:gap-2">
                  {["01 Escanea", "02 Consulta", "03 Contacta"].map((item) => (
                    <div key={item} className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-3 text-center text-[8px] font-bold uppercase tracking-[0.09em] text-slate-300 sm:rounded-2xl sm:px-3 sm:py-4 sm:text-[10px] sm:tracking-[0.12em]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </motion.div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:col-span-7">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <GlowCard customSize glowColor={feature.glowColor} className="h-full p-5 sm:min-h-[205px] sm:p-7">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl">
                        <feature.icon className={`h-[18px] w-[18px] sm:h-5 sm:w-5 ${feature.accent}`} />
                      </div>
                      <span className="text-[9px] font-black tracking-[0.16em] text-white/20 sm:text-[10px] sm:tracking-[0.18em]">0{index + 1}</span>
                    </div>
                    <div className="pt-5 sm:mt-auto sm:pt-8">
                      <h3 className="text-base font-extrabold tracking-[-0.02em] text-slate-100 sm:text-lg">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-[11px] font-semibold leading-5 text-slate-500 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3 sm:px-5 sm:py-4 sm:text-xs"
        >
          <span className="flex items-center gap-2"><Wifi className="h-4 w-4 shrink-0 text-sky-300" /> El teléfono que consulta necesita internet</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
          <span className="flex items-center gap-2"><Battery className="h-4 w-4 shrink-0 text-emerald-300" /> El sticker no necesita batería</span>
        </motion.div>
      </div>
    </section>
  );
}
