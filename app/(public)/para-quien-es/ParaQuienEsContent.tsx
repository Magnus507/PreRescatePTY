"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Baby,
  Bike,
  Brain,
  Building2,
  Check,
  Eye,
  Heart,
  Lock,
  MessageCircle,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { GlowCard } from "@/components/ui/spotlight-card";

const audiences = [
  {
    id: "familias",
    icon: Users,
    title: "Familias",
    desc: "Administra distintos perfiles médicos desde una sola cuenta. Cada miembro puede tener su propia identificación, información y contactos de emergencia.",
    cta: "Ver planes familiares",
    href: "/comprar",
    glow: "blue" as const,
  },
  {
    id: "ninos",
    icon: Baby,
    title: "Niños",
    desc: "Una identificación en la mochila, lonchera o pertenencias puede facilitar el acceso a información autorizada y a los contactos de los padres.",
    cta: "Conocer cómo funciona",
    href: "/como-funciona",
    note: "Los padres o responsables deciden qué información del menor se muestra públicamente.",
    glow: "purple" as const,
  },
  {
    id: "adultos-mayores",
    icon: Heart,
    title: "Adultos mayores",
    desc: "Permite mostrar información médica relevante, medicamentos, contactos e instrucciones útiles cuando la persona necesita ayuda para comunicarse.",
    cta: "Ver planes",
    href: "/comprar",
    glow: "red" as const,
  },
  {
    id: "desorientacion",
    icon: Brain,
    title: "Desorientación",
    desc: "Cuando una persona tiene dificultades para identificarse o recordar información, el perfil puede mostrar instrucciones de contacto y retorno seguro configuradas por su familia.",
    cta: "Conocer cómo funciona",
    href: "/como-funciona",
    note: "Solo se muestra la información autorizada por el titular o responsable.",
    glow: "green" as const,
  },
  {
    id: "comunicacion-asistida",
    icon: MessageCircle,
    title: "Comunicación asistida",
    desc: "Las instrucciones de comunicación pueden ayudar a quien brinda apoyo a comprender necesidades específicas y contactar a una persona autorizada.",
    cta: "Ver planes",
    href: "/comprar",
    glow: "blue" as const,
  },
  {
    id: "condiciones-medicas",
    icon: Stethoscope,
    title: "Alergias y condiciones médicas",
    desc: "Permite mostrar información autorizada como alergias, tipo de sangre, condiciones relevantes y medicamentos actuales.",
    cta: "Ver planes",
    href: "/comprar",
    disclaimer: "PreRescue ID no reemplaza la valoración ni la atención de profesionales de la salud.",
    glow: "red" as const,
  },
  {
    id: "en-movimiento",
    icon: Bike,
    title: "Personas en movimiento",
    desc: "Tu perfil puede consultarse desde cualquier lugar con acceso a internet. El sticker no necesita batería ni una aplicación instalada.",
    cta: "Probar el demo",
    href: "/demo",
    note: "El dispositivo que realiza el escaneo necesita conexión a internet para cargar el perfil.",
    glow: "orange" as const,
  },
  {
    id: "empresas",
    icon: Building2,
    title: "Empresas e instituciones",
    desc: "Las cuentas corporativas permiten gestionar miembros, perfiles y asignación de chips desde un panel administrativo.",
    cta: "Solicitar información",
    href: "/contacto",
    secondaryCta: "Ver empresas",
    secondaryHref: "/empresas",
    glow: "purple" as const,
  },
];

const privacyPoints = [
  { icon: Eye, title: "Visibilidad configurable", desc: "Decides qué información se muestra al escanear." },
  { icon: Lock, title: "Datos protegidos", desc: "Los datos internos de la cuenta no forman parte de la vista pública." },
  { icon: Shield, title: "Perfil separado", desc: "La vista de emergencia está separada del acceso a tu cuenta." },
];

export default function ParaQuienEsContent() {
  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Una identificación. Distintas necesidades."
          title="Diseñado para personas, familias"
          titleAccent="y equipos."
          description="PreRescue ID permite adaptar el perfil de emergencia a distintas situaciones. Tú decides qué información estará disponible al escanear cada identificación."
          primaryCTA={{ href: "/comprar", label: "Ver planes" }}
          secondaryCTA={{ href: "/demo", label: "Ver demo" }}
        />

        <section className="sticky top-14 z-30 border-y border-white/[0.055] bg-[#03060c]/92 py-2.5 backdrop-blur-xl sm:top-16 sm:py-4 sm:backdrop-blur-2xl md:top-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <nav aria-label="Categorías de uso" className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:snap-none">
              {audiences.map((aud) => (
                <Link
                  key={aud.id}
                  href={`#${aud.id}`}
                  className="flex min-h-10 shrink-0 snap-start touch-manipulation items-center rounded-xl border border-white/[0.065] bg-white/[0.025] px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 transition-all active:bg-white/[0.06] active:text-slate-200 sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.12em] sm:hover:border-sky-300/18 sm:hover:bg-white/[0.05] sm:hover:text-slate-200"
                >
                  {aud.title}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(42% 52% at 15% 18%, rgba(37,99,235,.09), transparent 64%), radial-gradient(36% 48% at 90% 72%, rgba(139,92,246,.07), transparent 68%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid items-end gap-5 sm:mb-14 sm:gap-7 lg:grid-cols-[1fr_.72fr]">
              <div>
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Casos de uso</p>
                <h2 className="max-w-[11ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
                  La misma tecnología, adaptada a cada contexto.
                </h2>
              </div>
              <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-7">
                No todos necesitan mostrar la misma información. El valor está en poder configurar cada perfil de forma independiente.
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {audiences.map((aud, index) => (
                <motion.article
                  key={aud.id}
                  id={aud.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.42, delay: (index % 2) * 0.04 }}
                  style={{ scrollMarginTop: "8rem" }}
                >
                  <GlowCard customSize glowColor={aud.glow} className="h-full p-5 sm:min-h-[360px] sm:p-8">
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-12 sm:w-12 sm:rounded-2xl">
                          <aud.icon className="h-[18px] w-[18px] text-slate-200 sm:h-5 sm:w-5" />
                        </span>
                        <span className="text-[9px] font-black tracking-[0.16em] text-white/20 sm:text-[10px] sm:tracking-[0.2em]">0{index + 1}</span>
                      </div>

                      <div className="mt-5 sm:mt-10">
                        <h3 className="text-xl font-black tracking-[-0.035em] text-slate-50 sm:text-3xl">{aud.title}</h3>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">{aud.desc}</p>
                        {aud.note && <p className="mt-3 text-xs leading-5 text-slate-600 sm:mt-4">{aud.note}</p>}
                        {aud.disclaimer && <p className="mt-3 text-xs italic leading-5 text-slate-600 sm:mt-4">{aud.disclaimer}</p>}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 sm:mt-auto sm:gap-3 sm:pt-8">
                        <Link href={aud.href} className="group inline-flex min-h-11 touch-manipulation items-center gap-2 text-[13px] font-bold text-sky-200 transition-colors active:text-white sm:min-h-0 sm:text-sm sm:hover:text-white">
                          {aud.cta}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        {aud.secondaryCta && aud.secondaryHref && (
                          <Link href={aud.secondaryHref} className="inline-flex min-h-11 touch-manipulation items-center text-[13px] font-bold text-slate-500 transition-colors active:text-slate-200 sm:min-h-0 sm:text-sm sm:hover:text-slate-200">
                            {aud.secondaryCta}
                          </Link>
                        )}
                      </div>
                    </div>
                  </GlowCard>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-9 sm:gap-12 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200 sm:text-[10px] sm:tracking-[0.18em]">
                  <Shield className="h-3.5 w-3.5" /> Configuración por perfil
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">
                  El contexto cambia. La privacidad no.
                </h2>
                <p className="mt-5 max-w-lg text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">
                  Cada perfil puede configurarse pensando en la información realmente útil para esa persona y situación.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                {privacyPoints.map((point, index) => (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="rounded-[1.25rem] border border-white/[0.07] bg-white/[0.026] p-5 sm:rounded-[1.6rem] sm:p-6"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] sm:rounded-2xl">
                      <point.icon className="h-4 w-4 text-emerald-300" />
                    </span>
                    <h3 className="mt-5 text-base font-extrabold text-slate-100 sm:mt-7">{point.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{point.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-[1.1rem] border border-sky-300/10 bg-sky-300/[0.035] p-4 sm:mt-8 sm:rounded-2xl sm:p-5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <p className="text-xs font-medium leading-5 text-slate-500">
                La información visible depende de la configuración disponible para cada perfil. PreRescue ID no sustituye servicios médicos ni de emergencia.
              </p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center shadow-[0_42px_110px_-65px_rgba(218,26,33,.6)] sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20 md:shadow-[0_50px_130px_-65px_rgba(218,26,33,.68)]">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-300/80 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">Encuentra tu configuración</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.6rem)] sm:leading-[0.88]">Una identificación preparada para tu realidad.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8">
                Crea uno o varios perfiles y configura la información que estará disponible al escanear cada identificación.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link href="/comprar" className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]">
                  Ver planes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/demo" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:border-sky-300/25 sm:hover:bg-white/[0.08]">
                  Ver demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
