"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  PackageCheck,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
  UsersRound,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { GlowCard } from "@/components/ui/spotlight-card";

const capabilities = [
  { icon: Users, title: "Gestión de miembros", desc: "Administra la estructura de la organización y los miembros asociados.", glow: "blue" as const },
  { icon: Shield, title: "Perfiles individuales", desc: "Cada colaborador cuenta con su propio perfil médico configurable.", glow: "green" as const },
  { icon: Smartphone, title: "Asignación de chips", desc: "Asigna identificaciones NFC + QR a los miembros de la organización.", glow: "purple" as const },
  { icon: CheckCircle2, title: "Visibilidad configurable", desc: "Cada perfil puede controlar la visibilidad de la información disponible al escanear.", glow: "red" as const },
];

const useCases = [
  "Personal de campo",
  "Conductores y flotas",
  "Equipos distribuidos",
  "Colegios y centros educativos",
  "Instituciones y asociaciones",
  "Actividades deportivas",
  "Organizaciones comunitarias",
];

const steps = [
  { num: "01", title: "Cuéntanos tu necesidad", desc: "Indica cuántos miembros deseas gestionar y el contexto de uso." },
  { num: "02", title: "Revisa las opciones", desc: "Selecciona un plan disponible o consulta una configuración corporativa." },
  { num: "03", title: "Organiza el equipo", desc: "Gestiona miembros, perfiles y asignación de identificaciones desde la cuenta corporativa." },
  { num: "04", title: "Cada perfil se configura", desc: "La información pública disponible depende de la configuración aplicable a cada perfil." },
];

const faqs = [
  { q: "¿Qué puede gestionar una cuenta corporativa?", a: "Miembros, perfiles médicos y la asignación de identificaciones NFC y QR dentro de la organización." },
  { q: "¿Cada colaborador tiene su propio perfil?", a: "Sí. Cada miembro puede tener un perfil independiente con información médica y contactos de emergencia configurados." },
  { q: "¿La empresa ve automáticamente toda la información médica?", a: "No. Administrar la organización no convierte toda la información médica en información visible para la empresa. La disponibilidad depende de los permisos y configuración aplicables." },
  { q: "¿Se necesita una aplicación?", a: "No. El perfil público se consulta desde un navegador compatible al escanear el QR o utilizar NFC." },
  { q: "¿El sticker necesita batería?", a: "No. El identificador físico no necesita batería propia." },
  { q: "¿Hay precios corporativos?", a: "Las opciones dependen de las necesidades de la organización. Puedes solicitar información para recibir una orientación específica." },
];

const members = [
  { initials: "AM", name: "Ana M.", area: "Operaciones", status: "Activo" },
  { initials: "JR", name: "José R.", area: "Logística", status: "Activo" },
  { initials: "LC", name: "Laura C.", area: "Administración", status: "Pendiente" },
];

function CorporateDashboardMockup() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px] sm:h-[78%] sm:w-[78%] sm:bg-indigo-500/15 sm:blur-[110px]" />
      <div className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.09] bg-[#080d15]/92 shadow-[0_40px_100px_-55px_rgba(79,70,229,.58)] backdrop-blur-xl sm:rounded-[2rem] sm:shadow-[0_52px_130px_-58px_rgba(79,70,229,.66)] sm:backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.07]">
              <ShieldCheck className="h-4 w-4 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[9px] sm:tracking-[0.16em]">Organization console</p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-slate-200 sm:text-xs">PreRescue ID · Empresa</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] text-slate-600 sm:flex">
            <Search className="h-3.5 w-3.5" /> Buscar miembro
          </div>
        </div>

        <div className="grid sm:min-h-[500px] sm:grid-cols-[150px_1fr]">
          <aside className="hidden border-r border-white/[0.06] bg-black/20 p-4 sm:block">
            <div className="space-y-2">
              {[
                [LayoutDashboard, "Resumen", true],
                [UsersRound, "Miembros", false],
                [PackageCheck, "Dispositivos", false],
              ].map(([Icon, label, active]) => {
                const ItemIcon = Icon as typeof LayoutDashboard;
                return (
                  <div key={String(label)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-bold ${active ? "bg-indigo-400/10 text-indigo-200" : "text-slate-600"}`}>
                    <ItemIcon className="h-3.5 w-3.5" /> {String(label)}
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="p-3.5 sm:p-5 lg:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {[
                ["Miembros", "48"],
                ["Chips activos", "43"],
                ["Pendientes", "5"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 sm:rounded-2xl sm:p-4">
                  <p className="truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-600 sm:text-[8px] sm:tracking-[0.14em]">{label}</p>
                  <p className="mt-1.5 text-lg font-black tracking-[-0.03em] text-slate-100 sm:mt-2 sm:text-2xl">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-white/[0.02] sm:mt-4 sm:rounded-[1.35rem]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3 sm:px-4 sm:py-3.5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-600 sm:text-[9px] sm:tracking-[0.15em]">Equipo</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-300 sm:text-xs">Miembros recientes</p>
                </div>
                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[8px] font-bold text-slate-500 sm:px-2.5 sm:text-[9px]">Ver todos</span>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {members.map((member) => (
                  <div key={member.name} className="grid grid-cols-[1fr_auto] items-center gap-2.5 px-3 py-3 sm:grid-cols-[1.2fr_.8fr_auto] sm:gap-3 sm:px-4 sm:py-3.5">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[9px] font-black text-slate-300">{member.initials}</div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-slate-200 sm:text-[11px]">{member.name}</p>
                        <p className="mt-0.5 truncate text-[8px] text-slate-600 sm:hidden">{member.area}</p>
                      </div>
                    </div>
                    <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">{member.area}</p>
                    <span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-wider sm:px-2.5 sm:text-[8px] ${member.status === "Activo" ? "bg-emerald-300/[0.07] text-emerald-300" : "bg-amber-300/[0.07] text-amber-300"}`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-300/10 bg-indigo-300/[0.035] p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-indigo-200/60 sm:text-[9px] sm:tracking-[0.14em]">Cobertura del equipo</p>
                <p className="mt-1 text-[10px] font-bold text-slate-300 sm:text-xs">89.5% de dispositivos asignados</p>
              </div>
              <div className="h-9 w-9 shrink-0 rounded-full border-[3px] border-indigo-300/20 border-t-indigo-300 sm:h-10 sm:w-10" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[9px] font-medium text-slate-600 sm:mt-3 sm:text-[10px]">Representación visual del panel corporativo.</p>
    </div>
  );
}

export default function EmpresasContent() {
  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Identificación médica para equipos"
          title="Gestiona la protección de tu organización"
          titleAccent="desde un solo panel."
          description="Las cuentas corporativas permiten organizar miembros, perfiles y asignación de identificaciones con una operación centralizada."
          primaryCTA={{ href: "/contacto?subject=Solicitud%20de%20información%20corporativa", label: "Solicitar información" }}
          secondaryCTA={{ href: "/comprar", label: "Ver planes" }}
        />

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(44% 54% at 85% 32%, rgba(79,70,229,.11), transparent 64%)" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-200 sm:text-[10px] sm:tracking-[0.18em]">
                  <Building2 className="h-3.5 w-3.5" /> Control centralizado
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">Un espacio para organizar a todo tu equipo.</h2>
                <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
                  El panel corporativo reúne la administración de miembros y dispositivos sin convertir la experiencia cotidiana en algo complejo.
                </p>
                <div className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
                  {[
                    "Panel para gestionar miembros",
                    "Asignación de chips por colaborador",
                    "Perfiles individuales",
                    "Operación centralizada",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <CorporateDashboardMockup />
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid items-end gap-5 sm:mb-14 sm:gap-7 lg:grid-cols-[1fr_.72fr]">
              <div>
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Capacidades</p>
                <h2 className="max-w-[11ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">Herramientas claras para administrar más de un perfil.</h2>
              </div>
              <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-7">La capa corporativa organiza la operación; cada perfil sigue siendo una identidad independiente.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {capabilities.map((cap, index) => (
                <motion.div key={cap.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.42, delay: index * 0.04 }}>
                  <GlowCard customSize glowColor={cap.glow} className="h-full p-5 sm:min-h-[260px] sm:p-6">
                    <div className="flex h-full flex-col">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl"><cap.icon className="h-[18px] w-[18px] text-slate-200 sm:h-5 sm:w-5" /></span>
                      <div className="pt-5 sm:mt-auto sm:pt-10">
                        <h3 className="text-base font-extrabold text-slate-100 sm:text-lg">{cap.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{cap.desc}</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-9 sm:gap-12 lg:grid-cols-[.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300/80 sm:text-[10px] sm:tracking-[0.2em]">Contextos</p>
                <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">Pensado para organizaciones con personas en movimiento.</h2>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {useCases.map((useCase, index) => (
                  <motion.div key={useCase} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.38, delay: index * 0.035 }} className="flex min-h-[52px] items-center gap-3 rounded-[1.05rem] border border-white/[0.065] bg-white/[0.026] p-4 sm:rounded-2xl sm:p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-indigo-300"><UsersRound className="h-4 w-4" /></span>
                    <p className="text-[13px] font-bold text-slate-300 sm:text-sm">{useCase}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center sm:mb-14">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Implementación</p>
              <h2 className="mx-auto max-w-[12ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">De la consulta inicial a la operación del equipo.</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div key={step.num} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, delay: index * 0.05 }} className="rounded-[1.35rem] border border-white/[0.065] bg-white/[0.025] p-5 sm:rounded-[1.6rem] sm:p-6">
                  <span className="text-3xl font-black tracking-[-0.05em] text-white/[0.08] sm:text-4xl">{step.num}</span>
                  <h3 className="mt-5 text-base font-extrabold text-slate-100 sm:mt-8 sm:text-lg">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-500 sm:mt-3">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center sm:mb-12">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/80 sm:text-[10px] sm:tracking-[0.2em]">Privacidad</p>
              <h2 className="text-[clamp(2.3rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.5rem,5vw,4.6rem)] sm:leading-[0.92]">Administración no significa exposición total.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">La organización gestiona estructura y asignaciones. La información disponible depende de los permisos y configuración aplicables a cada perfil.</p>
              <Link href="/legal/privacidad" className="group mt-6 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-emerald-200 transition-colors active:text-white sm:mt-8 sm:hover:text-white">Ver política de privacidad <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-9 text-center sm:mb-12">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">FAQ corporativo</p>
              <h2 className="text-[clamp(2.3rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.5rem,5vw,4.4rem)] sm:leading-[0.92]">Lo esencial antes de empezar.</h2>
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {faqs.map((faq, index) => (
                <motion.details key={faq.q} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.38, delay: index * 0.03 }} className="group overflow-hidden rounded-[1.15rem] border border-white/[0.065] bg-white/[0.025] open:border-indigo-300/15 open:bg-indigo-300/[0.03] sm:rounded-[1.45rem]">
                  <summary className="flex min-h-[60px] touch-manipulation cursor-pointer list-none items-center px-4 py-4 text-[13px] font-extrabold leading-5 text-slate-100 sm:min-h-0 sm:px-6 sm:py-5 sm:text-sm [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                  <div className="border-t border-white/[0.05] px-4 pb-5 pt-3.5 sm:px-6 sm:pb-6 sm:pt-4"><p className="text-sm leading-6 text-slate-400">{faq.a}</p></div>
                </motion.details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center shadow-[0_42px_110px_-65px_rgba(79,70,229,.6)] sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20 md:shadow-[0_50px_130px_-65px_rgba(79,70,229,.68)]">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(79,70,229,.25), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-indigo-300/80 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">PreRescue para organizaciones</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.6rem)] sm:leading-[0.88]">Cuéntanos cómo trabaja tu equipo.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8">Te mostraremos las opciones disponibles según el tamaño y las necesidades de la organización.</p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link href="/contacto?subject=Solicitud%20de%20información%20corporativa" className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]">Solicitar información <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/comprar" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:border-indigo-300/25 sm:hover:bg-white/[0.08]">Ver planes</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
