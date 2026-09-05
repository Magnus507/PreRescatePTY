"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, CircleHelp } from "lucide-react";

const faqs = [
  { q: "¿Necesito instalar una aplicación?", a: "No. El perfil se abre en el navegador del celular. No requiere instalar ninguna aplicación." },
  { q: "¿El sticker necesita batería?", a: "No. El sticker no tiene batería. El chip NFC se activa con la energía del dispositivo compatible que lo escanea." },
  { q: "¿Se necesita internet?", a: "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker no necesita batería ni conexión propia." },
  { q: "¿Qué información se muestra?", a: "El perfil puede mostrar datos médicos y contactos de emergencia según la información disponible y la configuración de visibilidad del perfil." },
  { q: "¿Cómo se contacta a mi familia?", a: "El perfil ofrece opciones de contacto por WhatsApp o llamada y el sistema puede procesar alertas de emergencia cuando esa función está habilitada." },
];

export default function FAQPreview() {
  return (
    <section className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_55%_at_18%_35%,rgba(37,99,235,0.10),transparent_62%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-9 sm:gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-sky-200 sm:mb-6 sm:text-[10px] sm:tracking-[0.18em]">
              <CircleHelp className="h-3.5 w-3.5" />
              Preguntas frecuentes
            </div>
            <h2 className="max-w-[9ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">
              Lo importante, sin letra pequeña.
            </h2>
            <p className="mt-5 max-w-md text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">
              Respuestas rápidas sobre el funcionamiento de PreRescue ID, el sticker y la consulta del perfil.
            </p>
            <Link href="/faq" className="group mt-6 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-sky-200 transition-colors active:text-white sm:mt-8 sm:hover:text-white">
              Ver todas las preguntas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <div className="space-y-2.5 sm:space-y-3">
            {faqs.map((faq, index) => (
              <motion.details
                key={faq.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.42, delay: index * 0.04 }}
                className="group overflow-hidden rounded-[1.15rem] border border-white/[0.07] bg-white/[0.025] open:border-sky-300/15 open:bg-sky-300/[0.035] sm:rounded-[1.5rem]"
              >
                <summary className="flex min-h-[60px] touch-manipulation cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:min-h-0 sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-[13px] font-extrabold leading-5 text-slate-100 sm:text-base">{faq.q}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-500 transition-colors group-open:border-sky-300/15 group-open:text-sky-300 sm:h-8 sm:w-8">
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                  </span>
                </summary>
                <div className="border-t border-white/[0.055] px-4 pb-5 pt-3.5 sm:px-6 sm:pb-6 sm:pt-4">
                  <p className="max-w-2xl text-sm leading-6 text-slate-400">{faq.a}</p>
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
