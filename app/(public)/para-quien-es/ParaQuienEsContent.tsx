"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Baby, Heart, Brain, MessageCircle, Stethoscope, Bike, Building2, Shield, Eye, Lock } from "lucide-react";

const audiences = [
  { id: "familias", icon: Users, title: "Familias", desc: "Administra distintos perfiles médicos desde una sola cuenta. Cada miembro puede tener su propia identificación, información y contactos de emergencia.", cta: "Ver planes familiares", href: "/comprar" },
  { id: "ninos", icon: Baby, title: "Niños", desc: "Una identificación en la mochila, lonchera o pertenencias puede facilitar el acceso a información autorizada y a los contactos de los padres.", cta: "Conocer cómo funciona", href: "/como-funciona", note: "Los padres o responsables deciden qué información del menor se muestra públicamente." },
  { id: "adultos-mayores", icon: Heart, title: "Adultos mayores", desc: "Permite mostrar información médica relevante, medicamentos, contactos e instrucciones útiles cuando la persona necesita ayuda para comunicarse.", cta: "Ver planes", href: "/comprar" },
  { id: "desorientacion", icon: Brain, title: "Desorientación", desc: "Cuando una persona tiene dificultades para identificarse o recordar información, el perfil puede mostrar instrucciones de contacto y retorno seguro configuradas por su familia.", cta: "Conocer cómo funciona", href: "/como-funciona", note: "Solo se muestra la información que el titular o responsable haya autorizado." },
  { id: "comunicacion-asistida", icon: MessageCircle, title: "Comunicación asistida", desc: "Las instrucciones de comunicación pueden ayudar a quien brinda apoyo a comprender necesidades específicas y contactar a una persona autorizada.", cta: "Ver planes", href: "/comprar" },
  { id: "condiciones-medicas", icon: Stethoscope, title: "Alergias y condiciones médicas", desc: "Permite mostrar información autorizada como alergias, tipo de sangre, condiciones relevantes y medicamentos actuales.", cta: "Ver planes", href: "/comprar", disclaimer: "PreRescue ID es un sistema de identificación médica de emergencia. No reemplaza la valoración ni la atención de profesionales de la salud." },
  { id: "en-movimiento", icon: Bike, title: "Quienes están en movimiento", desc: "Tu perfil puede consultarse desde cualquier lugar con acceso a internet. El sticker no necesita batería ni una aplicación instalada.", cta: "Probar el demo", href: "/demo", note: "El dispositivo que realiza el escaneo necesita conexión a internet para cargar el perfil." },
  { id: "empresas", icon: Building2, title: "Empresas e instituciones", desc: "Las cuentas corporativas permiten gestionar miembros, perfiles y asignación de chips desde un panel administrativo.", cta: "Solicitar información", href: "/contacto", secondaryCta: "Ver planes", secondaryHref: "/comprar" },
];

const privacyPoints = [
  { icon: Eye, title: "Visibilidad configurable", desc: "Decides qué información se muestra al escanear tu identificación." },
  { icon: Lock, title: "Datos cifrados", desc: "Información sensible protegida con cifrado." },
  { icon: Shield, title: "Datos nunca expuestos", desc: "Tu correo y fecha de nacimiento no se muestran públicamente." },
];

export default function ParaQuienEsContent() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Una identificación. Distintas necesidades."
          title="Diseñado para personas, familias y equipos"
          description="PreRescue ID permite mostrar información de emergencia adaptada a cada perfil y situación. Tú decides qué datos serán visibles al escanear tu identificación."
          primaryCTA={{ href: "/comprar", label: "Ver Planes" }}
          secondaryCTA={{ href: "/demo", label: "Ver Demo" }}
        />

        {/* Quick audience navigation */}
        <section className="py-8 bg-[#05070D] border-b border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav aria-label="Categorías de uso" className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {audiences.map((aud) => (
                <Link
                  key={aud.id}
                  href={`#${aud.id}`}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-[#A0AEC0] hover:bg-white/10 hover:text-[#EFF4FF] transition-all border border-white/10"
                >
                  {aud.title}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* Audience sections */}
        {audiences.map((aud, i) => (
          <section
            key={aud.id}
            id={aud.id}
            className={`py-24 md:py-32 ${i % 2 === 0 ? "bg-[#F4F6F8] text-[#1A1D23]" : "bg-[#05070D] text-[#EFF4FF]"}`}
            style={{ scrollMarginTop: "5rem" }}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <aud.icon className="h-6 w-6 text-[#10B981]" />
                  </div>
                  <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
                    {aud.title}
                  </h2>
                  <p className="text-lg font-medium leading-relaxed mb-6 opacity-90">
                    {aud.desc}
                  </p>
                  {aud.note && (
                    <p className="text-sm opacity-70 mb-6">
                      {aud.note}
                    </p>
                  )}
                  {aud.disclaimer && (
                    <p className="text-xs opacity-60 mb-6 italic">
                      {aud.disclaimer}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={aud.href}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all"
                    >
                      {aud.cta}
                    </Link>
                    {aud.secondaryCta && (
                      <Link
                        href={aud.secondaryHref}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[#EFF4FF] font-bold hover:bg-white/10 transition-all"
                      >
                        {aud.secondaryCta}
                      </Link>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`rounded-3xl p-8 md:p-10 ${i % 2 === 0 ? "glass-card-w2a-light" : "glass-card-w2a"}`}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {privacyPoints.map((point) => (
                      <div key={point.title} className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <point.icon className="h-5 w-5 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold mb-1">{point.title}</p>
                          <p className="text-xs opacity-70">{point.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        ))}

        {/* Final CTA */}
        <section className="py-24 md:py-32 bg-[#DA1A21]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] text-white mb-6">
              Encuentra el plan adecuado para tu situación
            </h2>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Crea uno o varios perfiles y configura la información que estará disponible al escanear cada identificación.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <Link
                href="/comprar"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
              >
                Ver Planes
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                Ver Demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}