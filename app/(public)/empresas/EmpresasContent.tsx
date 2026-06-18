"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Shield, Smartphone, CheckCircle2 } from "lucide-react";

const capabilities = [
  { icon: Users, title: "Gestión de miembros", desc: "Administra la estructura de tu organización y los miembros asociados." },
  { icon: Shield, title: "Perfiles individuales", desc: "Cada colaborador cuenta con su propio perfil médico configurable." },
  { icon: Smartphone, title: "Asignación de chips", desc: "Asigna identificaciones NFC y QR a los miembros de la organización." },
  { icon: CheckCircle2, title: "Visibilidad controlada", desc: "Cada usuario decide qué información se muestra al escanear su identificación." },
];

const useCases = [
  "Empresas con personal de campo",
  "Conductores y flotas",
  "Equipos distribuidos",
  "Colegios y centros educativos",
  "Instituciones y asociaciones",
  "Actividades deportivas",
  "Organizaciones comunitarias",
];

const steps = [
  { num: "01", title: "Solicita información", desc: "Cuéntanos cuántos miembros deseas gestionar y el uso previsto." },
  { num: "02", title: "Selecciona una opción", desc: "Revisa los planes disponibles o solicita información para una configuración corporativa." },
  { num: "03", title: "Gestiona miembros y perfiles", desc: "Administra miembros, perfiles y asignación de chips desde la cuenta de organización." },
  { num: "04", title: "Cada persona configura su información", desc: "Cada perfil puede definir qué información médica será visible al escanear su identificación." },
];

const faqs = [
  { q: "¿Qué puede gestionar una cuenta corporativa?", a: "Una cuenta corporativa permite administrar miembros, perfiles médicos y la asignación de identificaciones NFC y QR." },
  { q: "¿Cada colaborador tiene su propio perfil?", a: "Sí. Cada miembro puede tener su propio perfil con información médica y contactos de emergencia configurados." },
  { q: "¿La empresa puede ver toda la información médica?", a: "No. La información médica visible depende de la configuración de cada perfil. La organización gestiona la estructura de la cuenta, no el contenido médico privado." },
  { q: "¿Cómo se asignan los chips?", a: "Desde el panel administrativo se pueden asignar identificaciones a los miembros de la organización." },
  { q: "¿Se necesita una aplicación?", a: "No. El perfil se consulta desde cualquier navegador al escanear el código QR o el chip NFC." },
  { q: "¿El sticker necesita batería?", a: "No. El chip NFC se activa con la energía del celular que lo escanea." },
  { q: "¿Cómo solicito información?", a: "Para consultas corporativas, utiliza el formulario de contacto en /contacto y selecciona el asunto relacionado con empresas. Te responderemos lo antes posible." },
  { q: "¿Hay precios corporativos?", a: "Los precios y opciones se informan según las necesidades de cada organización. Contáctanos para recibir información detallada." },
  { q: "¿Cuál es el tiempo de respuesta?", a: "Responderemos tan pronto como sea posible. Proporciona toda la información relevante sobre tu organización en el formulario de contacto." },
];

export default function EmpresasContent() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Identificación médica para equipos"
          title="Gestiona la protección de tu organización desde un solo panel"
          description="Las cuentas corporativas permiten administrar miembros, perfiles y asignación de chips con información médica configurable."
          primaryCTA={{ href: "/contacto?subject=Solicitud%20de%20información%20corporativa", label: "Solicitar información" }}
          secondaryCTA={{ href: "/comprar", label: "Ver Planes" }}
        />

        {/* Capabilities */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
                Una cuenta para gestionar múltiples miembros
              </h2>
              <p className="text-lg text-[#A0AEC0] font-medium max-w-2xl mx-auto">
                Herramientas de administración para organizaciones que necesitan gestionar identificaciones médicas de emergencia.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass-card-w2a rounded-3xl p-6"
                >
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <cap.icon className="h-6 w-6 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#EFF4FF] mb-2">{cap.title}</h3>
                  <p className="text-sm text-[#A0AEC0] leading-relaxed">{cap.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#1A1D23] mb-4">
                Para organizaciones con personas en movimiento
              </h2>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
                Diseñado para equipos, instituciones y organizaciones que necesitan gestionar información médica de emergencia.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {useCases.map((useCase, i) => (
                <motion.div
                  key={useCase}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="glass-card-w2a-light rounded-2xl p-5"
                >
                  <p className="text-sm font-bold text-[#1A1D23]">{useCase}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
                Cómo funciona la configuración corporativa
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="text-6xl font-black text-[#DA1A21]/20 mb-4">{step.num}</div>
                  <h3 className="text-xl font-bold text-[#EFF4FF] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#A0AEC0] leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#1A1D23] mb-4">
                Administración corporativa sin exponer información innecesaria
              </h2>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
                La organización gestiona la estructura de la cuenta y la asignación de identificaciones. La información médica visible depende de la configuración de cada perfil.
              </p>
            </motion.div>

            <div className="text-center">
              <Link
                href="/legal/privacidad"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all"
              >
                Ver Política de Privacidad
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="glass-card-w2a rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-[#EFF4FF] mb-2">{faq.q}</h3>
                  <p className="text-sm text-[#A0AEC0] leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 bg-[#DA1A21]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] text-white mb-6">
              Conoce las opciones para tu organización
            </h2>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Cuéntanos las necesidades de tu equipo y te mostraremos las opciones disponibles.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <Link
                href="/contacto?subject=Solicitud%20de%20información%20corporativa"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
              >
                Solicitar información
              </Link>
              <Link
                href="/comprar"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                Ver Planes
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}