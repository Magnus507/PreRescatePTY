"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Battery,
  Check,
  Eye,
  FileText,
  Globe2,
  LockKeyhole,
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Wifi,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { GlowCard } from "@/components/ui/spotlight-card";

const steps = [
  {
    num: "01",
    icon: ShoppingBag,
    title: "Obtén tu PreRescue ID",
    desc: "Recibes una identificación física con chip NFC y código QR vinculable a tu cuenta.",
  },
  {
    num: "02",
    icon: Smartphone,
    title: "Activa el chip",
    desc: "Ingresas el código de activación y vinculas el dispositivo a tu cuenta de PreRescue ID.",
  },
  {
    num: "03",
    icon: FileText,
    title: "Configura tu perfil",
    desc: "Completa tu información médica y decides qué datos estarán disponibles en la vista pública.",
  },
  {
    num: "04",
    icon: ScanLine,
    title: "Escanea y consulta",
    desc: "Un teléfono compatible abre el perfil desde el navegador y muestra la información configurada.",
  },
];

const responderFields = [
  "Nombre visible",
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
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Cómo funciona"
          title="Del identificador físico al perfil digital"
          titleAccent="en cuatro pasos."
          description="Configura la información que deseas mostrar y permite que una persona consulte tu perfil mediante QR o NFC desde un navegador compatible."
          primaryCTA={{ href: "/comprar", label: "Ver planes" }}
          secondaryCTA={{ href: "/demo", label: "Ver demo" }}
        />

        <section className="border-y border-white/[0.055] bg-[#03060c] py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:px-6">
            <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5 text-sky-300" /> El teléfono necesita internet</span>
            <span className="flex items-center gap-2"><Battery className="h-3.5 w-3.5 text-emerald-300" /> El sticker no usa batería</span>
            <span className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 text-indigo-300" /> Consulta desde navegador</span>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(48% 54% at 82% 28%, rgba(37,99,235,.10), transparent 64%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 grid items-end gap-7 lg:grid-cols-[1fr_.7fr]">
              <div>
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">Preparación</p>
                <h2 className="max-w-[11ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
                  Configurarlo debe ser sencillo.
                </h2>
              </div>
              <p className="text-base font-medium leading-7 text-slate-400 sm:text-lg">
                El objetivo es reducir fricción antes de una emergencia y mantener la consulta lo más directa posible.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.52, delay: index * 0.06 }}
                >
                  <GlowCard customSize className="h-full min-h-[290px] p-6" glowColor={index === 3 ? "red" : index === 2 ? "green" : "blue"}>
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                          <step.icon className="h-5 w-5 text-sky-300" />
                        </span>
                        <span className="text-[10px] font-black tracking-[0.2em] text-white/20">{step.num}</span>
                      </div>
                      <div className="mt-auto pt-12">
                        <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-100">{step.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{step.desc}</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9"
              >
                <div aria-hidden="true" className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-400/10 blur-[80px]" />
                <div className="relative">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.06]">
                      <QrCode className="h-6 w-6 text-sky-300" />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Método 01</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-slate-50">Código QR</h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                    La cámara del teléfono puede leer el QR y abrir el perfil de emergencia en el navegador. No requiere instalar una aplicación.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <Check className="h-4 w-4" /> Cámara + navegador
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9"
              >
                <div aria-hidden="true" className="absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-400/10 blur-[80px]" />
                <div className="relative">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.06]">
                      <Smartphone className="h-6 w-6 text-indigo-300" />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Método 02</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-slate-50">Chip NFC</h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                    Un teléfono compatible con NFC puede leer el chip al acercarlo. El sticker no necesita batería ni conexión propia.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <Check className="h-4 w-4" /> NFC pasivo
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  <Eye className="h-3.5 w-3.5" /> Vista pública
                </div>
                <h2 className="max-w-[9ch] text-[clamp(2.7rem,5vw,4.9rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
                  Lo que puede ver quien escanea.
                </h2>
                <p className="mt-6 max-w-md text-base font-medium leading-7 text-slate-400">
                  El perfil puede mostrar información médica y contactos según la configuración del usuario.
                </p>
              </div>

              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {responderFields.map((field, index) => (
                    <motion.div
                      key={field}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: index * 0.04 }}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.065] bg-white/[0.026] px-5 py-4"
                    >
                      <span className="text-sm font-bold text-slate-300">{field}</span>
                      <Eye className="h-4 w-4 text-sky-300/60" />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    El correo de la cuenta y la fecha completa de nacimiento no forman parte de la vista pública del perfil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <MessageCircle className="h-5 w-5 text-sky-300" />
              </div>
              <h2 className="mt-8 text-3xl font-black tracking-[-0.04em] text-slate-50">Contacto manual</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                El perfil permite iniciar una llamada o abrir WhatsApp cuando esos contactos están disponibles. La persona que consulta debe iniciar la acción.
              </p>
              <p className="mt-5 text-xs leading-5 text-slate-600">
                La ubicación aproximada solo puede utilizarse cuando la persona que consulta concede el permiso correspondiente en su navegador.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <h2 className="mt-8 text-3xl font-black tracking-[-0.04em] text-slate-50">Vigencia del servicio</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                El servicio tiene una vigencia de 2 años desde la activación. Antes de finalizar ese período se informan las opciones disponibles para continuar el servicio.
              </p>
              <p className="mt-5 text-xs leading-5 text-slate-600">Actualmente no existe renovación automática.</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.09] bg-[#080c14] px-6 py-14 text-center shadow-[0_50px_130px_-65px_rgba(218,26,33,.7)] sm:px-10 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 80% 10%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-300/80">PreRescue ID</p>
              <h2 className="text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-[0.88] tracking-[-0.05em] text-slate-50">Configúralo antes de necesitarlo.</h2>
              <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Crea tu perfil, decide qué información será visible y conecta tu identificación física con QR + NFC.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/comprar" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]">
                  Ver planes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/demo" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.045] px-7 text-sm font-bold text-slate-100 transition-all hover:border-sky-300/25 hover:bg-white/[0.08]">
                  <ScanLine className="h-4 w-4 text-sky-300" /> Ver demo
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
