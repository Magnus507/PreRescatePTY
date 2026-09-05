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
    <section className="relative overflow-hidden bg-[#03060c] py-24 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(60% 55% at 20% 25%, rgba(14,165,233,.10), transparent 60%), radial-gradient(50% 55% at 84% 72%, rgba(79,70,229,.09), transparent 62%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.65 }}
          >
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300/80">Qué es PreRescue ID</p>
            <h2 className="max-w-[12ch] text-[clamp(2.6rem,5vw,5rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">
              Una identidad médica física conectada a tu perfil digital.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="lg:pb-2"
          >
            <p className="max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
              El objetivo es simple: que información médica relevante y contactos de emergencia puedan consultarse rápidamente mediante un sticker con QR y NFC, sin depender de una aplicación instalada.
            </p>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.6 }}
            className="xl:col-span-5"
          >
            <GlowCard customSize glowColor="blue" className="h-full min-h-[430px] p-7 sm:p-9">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-200">
                      <ScanLine className="h-3.5 w-3.5" />
                      Flujo de emergencia
                    </div>
                    <Fingerprint className="h-6 w-6 text-sky-300/60" />
                  </div>
                  <h3 className="max-w-[9ch] text-4xl font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-5xl">
                    Escanear. Consultar. Actuar.
                  </h3>
                  <p className="mt-5 max-w-md text-sm leading-6 text-slate-400 sm:text-base">
                    El perfil se abre desde el navegador y presenta la información configurada para la consulta pública.
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-2">
                  {["01 Escanea", "02 Consulta", "03 Contacta"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-4 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:col-span-7">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: index * 0.06 }}
              >
                <GlowCard customSize glowColor={feature.glowColor} className="h-full min-h-[205px] p-6 sm:p-7">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                        <feature.icon className={`h-5 w-5 ${feature.accent}`} />
                      </div>
                      <span className="text-[10px] font-black tracking-[0.18em] text-white/20">0{index + 1}</span>
                    </div>
                    <div className="mt-auto pt-8">
                      <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-100">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 text-xs font-semibold text-slate-500"
        >
          <span className="flex items-center gap-2"><Wifi className="h-4 w-4 text-sky-300" /> El teléfono que consulta necesita internet</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
          <span className="flex items-center gap-2"><Battery className="h-4 w-4 text-emerald-300" /> El sticker no necesita batería</span>
        </motion.div>
      </div>
    </section>
  );
}
