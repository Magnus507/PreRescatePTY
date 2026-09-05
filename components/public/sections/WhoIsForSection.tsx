"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Baby, Bike, Brain, Building2, Heart, Shield, Stethoscope, Users } from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";

const audiences = [
  { icon: Users, label: "Familias", desc: "Perfiles individuales para cada miembro", glow: "blue" as const },
  { icon: Baby, label: "Niños", desc: "Información relevante y contactos de padres", glow: "purple" as const },
  { icon: Heart, label: "Adultos mayores", desc: "Información médica y contactos disponibles", glow: "red" as const },
  { icon: Brain, label: "Desorientación", desc: "Datos útiles para facilitar el contacto seguro", glow: "green" as const },
  { icon: Shield, label: "Autismo / no verbal", desc: "Información e indicaciones configurables", glow: "blue" as const },
  { icon: Stethoscope, label: "Alergias y condiciones", desc: "Datos médicos relevantes a la vista", glow: "red" as const },
  { icon: Bike, label: "Motociclistas", desc: "Identificación visible en casco o pertenencias", glow: "orange" as const },
  { icon: Building2, label: "Empresas", desc: "Gestión centralizada para equipos", glow: "purple" as const },
];

export default function WhoIsForSection() {
  return (
    <section className="relative overflow-hidden bg-[#03060c] py-24 text-white md:py-32">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(45%_55%_at_82%_28%,rgba(59,130,246,0.10),transparent_62%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 grid items-end gap-8 lg:grid-cols-[1fr_.65fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300/80">Para quién es</p>
            <h2 className="max-w-[12ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
              Un sistema. Distintas formas de estar preparado.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="lg:pb-2"
          >
            <p className="text-base font-medium leading-7 text-slate-400 sm:text-lg">
              PreRescue ID puede adaptarse a personas, familias, usuarios con necesidades específicas y organizaciones.
            </p>
            <Link href="/para-quien-es" className="group mt-5 inline-flex items-center gap-2 text-sm font-bold text-sky-200 transition-colors hover:text-white">
              Explorar todos los casos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.045 }}
            >
              <GlowCard customSize glowColor={audience.glow} className="h-full min-h-[220px] p-6">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                      <audience.icon className="h-5 w-5 text-slate-200" />
                    </span>
                    <span className="text-[9px] font-black tracking-[0.18em] text-white/20">0{index + 1}</span>
                  </div>
                  <div className="mt-auto pt-9">
                    <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-100">{audience.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{audience.desc}</p>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
