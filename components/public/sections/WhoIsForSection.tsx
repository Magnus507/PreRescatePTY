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
    <section className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(45%_55%_at_82%_28%,rgba(59,130,246,0.10),transparent_62%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 grid items-end gap-6 sm:mb-14 sm:gap-8 lg:grid-cols-[1fr_.65fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300/80 sm:mb-5 sm:text-xs sm:tracking-[0.2em]">Para quién es</p>
            <h2 className="max-w-[12ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
              Un sistema. Distintas formas de estar preparado.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="lg:pb-2"
          >
            <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-7">
              PreRescue ID puede adaptarse a personas, familias, usuarios con necesidades específicas y organizaciones.
            </p>
            <Link href="/para-quien-es" className="group mt-4 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-sky-200 transition-colors active:text-white sm:mt-5 sm:hover:text-white">
              Explorar todos los casos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.42, delay: index * 0.035 }}
            >
              <GlowCard customSize glowColor={audience.glow} className="h-full p-5 sm:min-h-[220px] sm:p-6">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl">
                      <audience.icon className="h-[18px] w-[18px] text-slate-200 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[8px] font-black tracking-[0.16em] text-white/20 sm:text-[9px] sm:tracking-[0.18em]">0{index + 1}</span>
                  </div>
                  <div className="pt-5 sm:mt-auto sm:pt-9">
                    <h3 className="text-base font-extrabold tracking-[-0.02em] text-slate-100 sm:text-lg">{audience.label}</h3>
                    <p className="mt-1.5 text-sm leading-5 text-slate-500 sm:mt-2 sm:leading-6">{audience.desc}</p>
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
