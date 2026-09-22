"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
} from "lucide-react";

const steps = [
  {
    id: "compra",
    eyebrow: "01",
    label: "Compra",
    title: "Elige el identificador que vas a llevar contigo.",
    description:
      "Sticker, pulsera, llavero de retorno seguro o identificador para mascotas. El catálogo y los precios publicados vienen de la operación real.",
    image: "/media/purchase-kit.avif",
    alt: "Contenido de compra de PreRescue ID",
    icon: ShoppingBag,
    detail: "Producto físico + código de activación",
    href: "/comprar",
  },
  {
    id: "activa",
    eyebrow: "02",
    label: "Activa",
    title: "Vincula el dispositivo con tu perfil.",
    description:
      "Usa el código de activación y configura únicamente la información que quieres dejar disponible para una consulta rápida.",
    image: "/media/sticker-emergency.avif",
    alt: "Sticker de emergencia PreRescue ID",
    icon: Smartphone,
    detail: "Controlas qué información se muestra",
    href: "/como-funciona",
  },
  {
    id: "escanea",
    eyebrow: "03",
    label: "Escanea",
    title: "QR + NFC llevan al perfil desde el navegador.",
    description:
      "La persona que ayuda puede escanear el QR o acercar un teléfono compatible al NFC. El identificador pasivo no necesita batería.",
    image: "/media/medical-tags.avif",
    alt: "Identificadores médicos PreRescue ID con QR y NFC",
    icon: QrCode,
    detail: "Sin instalar aplicaciones",
    href: "/como-funciona",
  },
  {
    id: "contacta",
    eyebrow: "04",
    label: "Contacta",
    title: "La información útil queda a un toque de distancia.",
    description:
      "El perfil puede facilitar datos autorizados y vías de contacto para una emergencia, retorno seguro o reencuentro con una mascota.",
    image: "/media/pet-tags.webp",
    alt: "Identificador de mascotas PreRescue ID",
    icon: MessageCircle,
    detail: "Emergencia, familia y retorno seguro",
    href: "/para-quien-es",
  },
] as const;

export default function EmergencyTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const activeStep = steps[activeIndex];

  return (
    <section className="relative overflow-hidden bg-[#f6f8fc] py-16 text-slate-950 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-sky-200/55 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_.72fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5 text-[#DA1A21]" />
              Cómo funciona
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.5rem,8vw,4.8rem)] font-black leading-[0.91] tracking-[-0.05em]">
              Todo el recorrido,
              <span className="block text-[#DA1A21]">en una sola vista.</span>
            </h2>
          </div>
          <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
            En vez de obligarte a recorrer varias secciones, condensamos el flujo
            completo en cuatro pasos. Toca cada etapa para ver qué ocurre.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-slate-200/80 bg-white/85 p-3 shadow-[0_28px_90px_-52px_rgba(15,23,42,.32)] backdrop-blur-xl sm:mt-12 sm:p-5 lg:p-7">
          <div className="relative">
            <div className="absolute left-[10%] right-[10%] top-[27px] hidden h-px bg-slate-200 md:block" />
            <motion.div
              aria-hidden="true"
              className="absolute left-[10%] top-[27px] hidden h-px origin-left bg-gradient-to-r from-[#DA1A21] via-[#f43f5e] to-[#2563eb] md:block"
              animate={{ scaleX: activeIndex / (steps.length - 1) }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
              style={{ width: "80%" }}
            />

            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:pb-0">
              {steps.map((step, index) => {
                const selected = index === activeIndex;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={selected}
                    className={`relative min-w-[150px] snap-start rounded-2xl border px-3 py-3 text-left transition-all md:min-w-0 md:border-transparent md:bg-transparent md:px-2 md:pt-0 ${
                      selected
                        ? "border-slate-200 bg-slate-50 shadow-sm md:shadow-none"
                        : "border-slate-100 bg-white/50"
                    }`}
                  >
                    <span
                      className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border text-sm font-black transition-all md:mx-auto ${
                        selected
                          ? "border-[#DA1A21]/20 bg-[#DA1A21] text-white shadow-[0_12px_28px_-14px_rgba(218,26,33,.75)]"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 md:text-center">
                      {step.eyebrow}
                    </span>
                    <span
                      className={`mt-1 block text-sm font-black md:text-center ${
                        selected ? "text-slate-950" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid min-h-[380px] overflow-hidden rounded-[1.6rem] bg-[#0b1220] text-white sm:min-h-[420px] lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-[270px] overflow-hidden lg:min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={reducedMotion ? false : { opacity: 0, scale: 1.035 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, scale: 0.99 }}
                  transition={{ duration: reducedMotion ? 0 : 0.38 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={activeStep.image}
                    alt={activeStep.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 52vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0b1220]/55"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeStep.id}-copy`}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {activeStep.detail}
                  </div>
                  <h3 className="mt-5 text-3xl font-black leading-[1] tracking-[-0.035em] sm:text-4xl">
                    {activeStep.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                    {activeStep.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Diseñado para consultar rápido cuando importa.
                  </div>
                  <Link
                    href={activeStep.href}
                    className="group mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    Ver más
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
