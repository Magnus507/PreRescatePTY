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

        <section className="border-y border-white/[0.055] bg-[#03060c] py-3.5 sm:py-5">
          <div className="mx-auto flex max-w-5xl snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-x-7 sm:gap-y-3 sm:px-6">
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><Wifi className="h-3.5 w-3.5 text-sky-300" /> El teléfono necesita internet</span>
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><Battery className="h-3.5 w-3.5 text-emerald-300" /> El sticker no usa batería</span>
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><Globe2 className="h-3.5 w-3.5 text-indigo-300" /> Consulta desde navegador</span>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(48% 54% at 82% 28%, rgba(37,99,235,.10), transparent 64%)" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid items-end gap-5 sm:mb-14 sm:gap-7 lg:grid-cols-[1fr_.7fr]">
              <div>
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Preparación</p>
                <h2 className="max-w-[11ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">Configurarlo debe ser sencillo.</h2>
              </div>
              <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-7">El objetivo es reducir fricción antes de una emergencia y mantener la consulta lo más directa posible.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div key={step.num} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.42, delay: index * 0.04 }}>
                  <GlowCard customSize className="h-full p-5 sm:min-h-[290px] sm:p-6" glowColor={index === 3 ? "red" : index === 2 ? "green" : "blue"}>
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl"><step.icon className="h-[18px] w-[18px] text-sky-300 sm:h-5 sm:w-5" /></span>
                        <span className="text-[9px] font-black tracking-[0.16em] text-white/20 sm:text-[10px] sm:tracking-[0.2em]">{step.num}</span>
                      </div>
                      <div className="pt-5 sm:mt-auto sm:pt-12">
                        <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-100 sm:text-lg">{step.title}</h3>
                        <p className="mt-2.5 text-sm leading-6 text-slate-500 sm:mt-3">{step.desc}</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-3 sm:gap-5 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-70px" }} className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
                <div aria-hidden="true" className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-400/[0.08] blur-[65px] sm:h-56 sm:w-56 sm:bg-sky-400/10 sm:blur-[80px]" />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between sm:mb-8">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-300/[0.06] sm:h-12 sm:w-12 sm:rounded-2xl"><QrCode className="h-5 w-5 text-sky-300 sm:h-6 sm:w-6" /></span>
                    <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-[9px] sm:tracking-[0.18em]">Método 01</span>
                  </div>
                  <h3 className="text-[1.7rem] font-black tracking-[-0.04em] text-slate-50 sm:text-3xl">Código QR</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">La cámara del teléfono puede leer el QR y abrir el perfil de emergencia en el navegador. No requiere instalar una aplicación.</p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-300 sm:mt-8"><Check className="h-4 w-4" /> Cámara + navegador</div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-70px" }} className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
                <div aria-hidden="true" className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-400/[0.08] blur-[65px] sm:h-56 sm:w-56 sm:bg-indigo-400/10 sm:blur-[80px]" />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between sm:mb-8">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.06] sm:h-12 sm:w-12 sm:rounded-2xl"><Smartphone className="h-5 w-5 text-indigo-300 sm:h-6 sm:w-6" /></span>
                    <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-[9px] sm:tracking-[0.18em]">Método 02</span>
                  </div>
                  <h3 className="text-[1.7rem] font-black tracking-[-0.04em] text-slate-50 sm:text-3xl">Chip NFC</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">Un teléfono compatible con NFC puede leer el chip al acercarlo. El sticker no necesita batería ni conexión propia.</p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-300 sm:mt-8"><Check className="h-4 w-4" /> NFC pasivo</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-9 sm:gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200 sm:text-[10px] sm:tracking-[0.18em]"><Eye className="h-3.5 w-3.5" /> Vista pública</div>
                <h2 className="max-w-[9ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.9rem)] sm:leading-[0.91]">Lo que puede ver quien escanea.</h2>
                <p className="mt-5 max-w-md text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">El perfil puede mostrar información médica y contactos según la configuración del usuario.</p>
              </div>

              <div>
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  {responderFields.map((field, index) => (
                    <motion.div key={field} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.38, delay: index * 0.035 }} className="flex min-h-[52px] items-center justify-between rounded-[1.05rem] border border-white/[0.065] bg-white/[0.026] px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
                      <span className="text-[13px] font-bold text-slate-300 sm:text-sm">{field}</span>
                      <Eye className="h-4 w-4 shrink-0 text-sky-300/60" />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex items-start gap-3 rounded-[1.05rem] border border-white/[0.06] bg-black/20 p-4 sm:mt-4 sm:rounded-2xl sm:p-5">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p className="text-xs font-medium leading-5 text-slate-500">El correo de la cuenta y la fecha completa de nacimiento no forman parte de la vista pública del perfil.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:gap-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-12 sm:w-12 sm:rounded-2xl"><MessageCircle className="h-5 w-5 text-sky-300" /></div>
              <h2 className="mt-5 text-[1.7rem] font-black tracking-[-0.04em] text-slate-50 sm:mt-8 sm:text-3xl">Contacto manual</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">El perfil permite iniciar una llamada o abrir WhatsApp cuando esos contactos están disponibles. La persona que consulta debe iniciar la acción.</p>
              <p className="mt-4 text-xs leading-5 text-slate-600 sm:mt-5">La ubicación aproximada solo puede utilizarse cuando la persona que consulta concede el permiso correspondiente en su navegador.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-12 sm:w-12 sm:rounded-2xl"><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>
              <h2 className="mt-5 text-[1.7rem] font-black tracking-[-0.04em] text-slate-50 sm:mt-8 sm:text-3xl">Vigencia del servicio</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">El servicio tiene una vigencia de 2 años desde la activación. Antes de finalizar ese período se informan las opciones disponibles para continuar el servicio.</p>
              <p className="mt-4 text-xs leading-5 text-slate-600 sm:mt-5">Actualmente no existe renovación automática.</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center shadow-[0_42px_110px_-65px_rgba(218,26,33,.62)] sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20 md:shadow-[0_50px_130px_-65px_rgba(218,26,33,.7)]">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 80% 10%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-300/80 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">PreRescue ID</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.6rem)] sm:leading-[0.88]">Configúralo antes de necesitarlo.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8">Crea tu perfil, decide qué información será visible y conecta tu identificación física con QR + NFC.</p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link href="/comprar" className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]">Ver planes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/demo" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:border-sky-300/25 sm:hover:bg-white/[0.08]"><ScanLine className="h-4 w-4 text-sky-300" /> Ver demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
