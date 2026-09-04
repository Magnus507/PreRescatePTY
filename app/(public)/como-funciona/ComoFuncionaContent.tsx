"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Smartphone, FileText, Scan, QrCode, Wifi, MessageCircle } from "lucide-react";

const steps = [
  { num: "01", icon: ShoppingCart, title: "Adquiere tu identificación", desc: "Recibe tu sticker con chip NFC y código QR." },
  { num: "02", icon: Smartphone, title: "Activa tu chip", desc: "Ingresa el código de activación y vincúlalo a tu cuenta." },
  { num: "03", icon: FileText, title: "Configura tu perfil", desc: "Completa tu información médica y decide qué campos serán visibles." },
  { num: "04", icon: Scan, title: "Escanea y consulta", desc: "Quien escanee podrá ver la información autorizada y contactar manualmente a tus familiares." },
];

const responderFields = [
  "Nombre",
  "Tipo de sangre",
  "Alergias",
  "Condiciones médicas",
  "Medicamentos",
  "Contactos de emergencia",
  "Instrucciones de comunicación",
  "Instrucciones de retorno seguro",
];

export default function ComoFuncionaContent() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Cómo funciona"
          title="Tu identificación médica, lista en cuatro pasos"
          description="Configura la información que deseas mostrar y permite que cualquier persona consulte tu perfil al escanear el QR o el chip NFC."
          secondaryCTA={{ href: "/demo", label: "Ver demo" }}
        />

        {/* Clarification */}
        <section className="py-6 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-[#6B7280] text-center">
              El dispositivo que realiza el escaneo necesita conexión a internet para cargar el perfil. El sticker no necesita batería ni conexión.
            </p>
          </div>
        </section>

        {/* Four Steps */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
                >
                  <div className="text-5xl font-black text-slate-100 mb-4">{step.num}</div>
                  <div className="h-12 w-12 rounded-xl bg-[#DA1A21]/10 flex items-center justify-center mb-4">
                    <step.icon className="h-6 w-6 text-[#DA1A21]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* QR and NFC */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="glass-card-w2a rounded-3xl p-8 md:p-10"
              >
                <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <QrCode className="h-6 w-6 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-bold text-[#EFF4FF] mb-3">Código QR</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed mb-4">
                  Cualquier celular con cámara puede escanear el código QR. La cámara abre automáticamente el perfil de emergencia en el navegador.
                </p>
                <p className="text-xs text-[#6B7280]">
                  No requiere instalar una aplicación.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-card-w2a rounded-3xl p-8 md:p-10"
              >
                <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <Wifi className="h-6 w-6 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-bold text-[#EFF4FF] mb-3">Chip NFC</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed mb-4">
                  Los celulares con NFC pueden leer el chip al acercarlo. El perfil se abre automáticamente, sin necesidad de abrir la cámara.
                </p>
                <p className="text-xs text-[#6B7280]">
                  El sticker no necesita batería ni conexión.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* What the responder sees */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
                Lo que ve el respondedor
              </h2>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
                Solo se muestra la información que tú autorizas.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {responderFields.map((field, i) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"
                >
                  <p className="text-sm font-bold text-slate-900">{field}</p>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-sm text-[#6B7280] mt-8">
              Tu correo electrónico y fecha de nacimiento completa no se muestran públicamente.
            </p>
          </div>
        </section>

        {/* Manual contact */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card-w2a rounded-3xl p-8 md:p-10">
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <MessageCircle className="h-6 w-6 text-[#10B981]" />
              </div>
              <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
                Contacto manual
              </h2>
              <p className="text-lg text-[#A0AEC0] font-medium leading-relaxed mb-6">
                El perfil de emergencia permite contactar manualmente a los familiares por WhatsApp o llamada. El respondedor debe iniciar la acción.
              </p>
              <p className="text-sm text-[#6B7280]">
                La ubicación aproximada puede incluirse solo si el respondedor otorga permiso de ubicación en su navegador. No se envía información automáticamente al escanear.
              </p>
            </div>
          </div>
        </section>

        {/* Service expiration */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card-w2a rounded-3xl p-8 md:p-10">
              <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
                Vigencia del servicio
              </h2>
              <p className="text-lg text-[#A0AEC0] font-medium leading-relaxed">
                El servicio tiene una vigencia de 2 años desde la activación. Antes de finalizar este período se informarán las opciones disponibles para continuar el servicio. Actualmente no existe renovación automática.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
                Tu información. Tus decisiones.
              </h2>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
                Diseñamos el servicio tomando como referencia la Ley 81 de Protección de Datos Personales de Panamá.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: "Visibilidad configurable", desc: "Decides qué información se muestra al escanear tu chip." },
                { title: "Datos cifrados", desc: "Información sensible protegida con cifrado." },
                { title: "Datos nunca expuestos", desc: "Tu correo y fecha de nacimiento no se muestran públicamente." },
                { title: "Eliminación disponible", desc: "Puedes solicitar la eliminación de tu cuenta en cualquier momento." },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                >
                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/legal/privacidad"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold hover:bg-slate-50 transition-all"
              >
                Conocer nuestra política de privacidad
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 bg-[#DA1A21]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] text-white mb-6">
              Configura tu perfil médico de emergencia
            </h2>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Crea tu perfil y elige qué información estará disponible al escanear tu identificación.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <Link
                href="/comprar"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
              >
                Conocer los planes
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
