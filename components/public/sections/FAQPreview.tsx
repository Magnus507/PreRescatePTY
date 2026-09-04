"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "¿Necesito instalar una aplicación?", a: "No. El perfil se abre en el navegador del celular. No requiere instalar ninguna aplicación." },
  { q: "¿El sticker necesita batería?", a: "No. El sticker no tiene batería. El chip NFC se activa con la energía del dispositivo compatible que lo escanea." },
  { q: "¿Se necesita internet?", a: "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker no necesita batería ni conexión." },
  { q: "¿Qué información se muestra?", a: "El perfil puede mostrar datos médicos y contactos de emergencia según la información disponible y la configuración de visibilidad del perfil." },
  { q: "¿Cómo se contacta a mi familia?", a: "El perfil ofrece opciones de contacto por WhatsApp o llamada y el sistema puede procesar alertas de emergencia cuando esa función está habilitada." },
];

export default function FAQPreview() {
  return (
    <section className="relative py-24 md:py-32 bg-[#05070D] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-lg text-[#A0AEC0] font-medium max-w-2xl mx-auto">
            Respuestas a las dudas más comunes sobre PreRescue ID.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass-card-w2a rounded-2xl p-6"
            >
              <h3 className="text-base font-bold text-[#EFF4FF] mb-2 flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-[#10B981]" />
                {faq.q}
              </h3>
              <p className="text-sm text-[#A0AEC0] leading-relaxed pl-6">{faq.a}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[#EFF4FF] font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
          >
            Ver preguntas frecuentes
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
