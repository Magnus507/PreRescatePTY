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
    <section
      id="recorrido"
      className="relative overflow-hidden bg-[#fffdfb] py-14 text-slate-950 sm:py-18 lg:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-rose-200/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-28 bottom-4 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_.72fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5 text-[#DA1A21]" />
              En cuatro pasos
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.5rem,8vw,4.8rem)] font-black leading-[0.91] tracking-[-0.05em]">
              Cómo funciona,
              <span className="block text-[#DA1A21]">sin hacerte scrollear de más.</span>
            </h2>
          </div>
          <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
            Una línea de tiempo compacta concentra lo esencial. Elige cada etapa y
            la explicación cambia en el mismo espacio.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,.34)] sm:mt-12">
          <div className="relative border-b border-slate-100 px-3 pb-4 pt-5 sm:px-6 sm:pt-6 lg:px-8">
            <div className="absolute left-[12%] right-[12%] top-[34px] hidden h-[2px] bg-slate-200 md:block" />
            <motion.div
              aria-hidden="true"
              className="absolute left-[12%] top-[34px] hidden h-[2px] origin-left rounded-full bg-gradient-to-r from-[#DA1A21] via-[#ff4b55] to-[#2876c7] md:block"
              animate={{ scaleX: activeIndex / (steps.length - 1) }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
              style={{ width: "76%" }}
            />

            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
              {steps.map((step, index) => {
                const selected = index === activeIndex;
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={selected}
                    className={`group relative min-w-[148px] snap-start rounded-2xl px-3 py-2.5 text-left transition-all md:min-w-0 md:bg-transparent md:text-center ${
                      selected ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <motion.span
                      layout
                      className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors md:mx-auto ${
                        selected
                          ? "border-[#DA1A21]/20 bg-[#DA1A21] text-white shadow-[0_12px_28px_-14px_rgba(218,26,33,.65)]"
                          : "border-slate-200 bg-white text-slate-500 group-hover:border-blue-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.span>
                    <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {step.eyebrow}
                    </span>
                    <span
                      className={`mt-1 block text-sm font-black ${
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

          <div className="grid min-h-[390px] lg:grid-cols-[.94fr_1.06fr]">
            <div className="relative min-h-[270px] overflow-hidden bg-[#eef6ff] lg:min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={reducedMotion ? false : { opacity: 0, x: -18, scale: 1.025 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: 14, scale: 0.99 }}
                  transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={activeStep.image}
                    alt={activeStep.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/5 lg:bg-gradient-to-r lg:from-transparent lg:to-white/18"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-4 left-4 rounded-full border border-white/80 bg-white/86 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[#185b9d] shadow-sm backdrop-blur">
                {activeStep.label}
              </div>
            </div>

            <div className="relative flex flex-col justify-center bg-[radial-gradient(circle_at_90%_10%,rgba(219,234,254,.75),transparent_34%),radial-gradient(circle_at_10%_85%,rgba(254,226,226,.7),transparent_34%),#ffffff] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeStep.id}-copy`}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reducedMotion ? 0 : 0.28 }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#185b9d]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {activeStep.detail}
                  </div>
                  <h3 className="mt-5 max-w-[14ch] text-3xl font-black leading-[1] tracking-[-0.04em] text-slate-950 sm:text-4xl">
                    {activeStep.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    {activeStep.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Diseñado para consultar rápido cuando importa.
                  </div>
                  <Link
                    href={activeStep.href}
                    className="group mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-[#0f3159] px-5 text-sm font-black text-white shadow-[0_16px_35px_-22px_rgba(15,49,89,.7)] transition-all hover:-translate-y-0.5 hover:bg-[#17487f]"
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
