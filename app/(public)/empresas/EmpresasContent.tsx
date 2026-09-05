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
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[110px]" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#080d15]/92 shadow-[0_52px_130px_-58px_rgba(79,70,229,.66)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.07]">
              <ShieldCheck className="h-4 w-4 text-indigo-200" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Organization console</p>
              <p className="mt-0.5 text-xs font-bold text-slate-200">PreRescue ID · Empresa</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] text-slate-600 sm:flex">
            <Search className="h-3.5 w-3.5" /> Buscar miembro
          </div>
        </div>

        <div className="grid min-h-[500px] sm:grid-cols-[150px_1fr]">
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

          <div className="p-4 sm:p-5 lg:p-6">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["Miembros", "48"],
                ["Chips activos", "43"],
                ["Pendientes", "5"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 sm:p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</p>
                  <p className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-100 sm:text-2xl">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">Equipo</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300">Miembros recientes</p>
                </div>
                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-bold text-slate-500">Ver todos</span>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {members.map((member) => (
                  <div key={member.name} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[1.2fr_.8fr_auto]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[9px] font-black text-slate-300">{member.initials}</div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-200">{member.name}</p>
                        <p className="mt-0.5 text-[9px] text-slate-600 sm:hidden">{member.area}</p>
                      </div>
                    </div>
                    <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">{member.area}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${member.status === "Activo" ? "bg-emerald-300/[0.07] text-emerald-300" : "bg-amber-300/[0.07] text-amber-300"}`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-indigo-300/10 bg-indigo-300/[0.035] p-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-200/60">Cobertura del equipo</p>
                <p className="mt-1 text-xs font-bold text-slate-300">89.5% de dispositivos asignados</p>
              </div>
              <div className="h-10 w-10 rounded-full border-[3px] border-indigo-300/20 border-t-indigo-300" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] font-medium text-slate-600">Representación visual del panel corporativo.</p>
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

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(44% 54% at 85% 32%, rgba(79,70,229,.11), transparent 64%)" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">
                  <Building2 className="h-3.5 w-3.5" /> Control centralizado
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Un espacio para organizar a todo tu equipo.</h2>
                <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
                  El panel corporativo reúne la administración de miembros y dispositivos sin convertir la experiencia cotidiana en algo complejo.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    "Panel para gestionar miembros",
                    "Asignación de chips por colaborador",
                    "Perfiles individuales",
                    "Operación centralizada",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <CorporateDashboardMockup />
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 grid items-end gap-7 lg:grid-cols-[1fr_.72fr]">
              <div>
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">Capacidades</p>
                <h2 className="max-w-[11ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Herramientas claras para administrar más de un perfil.</h2>
              </div>
              <p className="text-base font-medium leading-7 text-slate-400 sm:text-lg">La capa corporativa organiza la operación; cada perfil sigue siendo una identidad independiente.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((cap, index) => (
                <motion.div key={cap.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: index * 0.06 }}>
                  <GlowCard customSize glowColor={cap.glow} className="h-full min-h-[260px] p-6">
                    <div className="flex h-full flex-col">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]"><cap.icon className="h-5 w-5 text-slate-200" /></span>
                      <div className="mt-auto pt-10">
                        <h3 className="text-lg font-extrabold text-slate-100">{cap.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{cap.desc}</p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Contextos</p>
                <h2 className="max-w-[10ch] text-[clamp(2.7rem,5vw,4.8rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Pensado para organizaciones con personas en movimiento.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {useCases.map((useCase, index) => (
                  <motion.div key={useCase} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.026] p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-indigo-300"><UsersRound className="h-4 w-4" /></span>
                    <p className="text-sm font-bold text-slate-300">{useCase}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">Implementación</p>
              <h2 className="mx-auto max-w-[12ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">De la consulta inicial a la operación del equipo.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.48, delay: index * 0.06 }} className="rounded-[1.6rem] border border-white/[0.065] bg-white/[0.025] p-6">
                  <span className="text-4xl font-black tracking-[-0.05em] text-white/[0.08]">{step.num}</span>
                  <h3 className="mt-8 text-lg font-extrabold text-slate-100">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Privacidad</p>
              <h2 className="text-[clamp(2.5rem,5vw,4.6rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">Administración no significa exposición total.</h2>
              <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-slate-400">La organización gestiona estructura y asignaciones. La información disponible depende de los permisos y configuración aplicables a cada perfil.</p>
              <Link href="/legal/privacidad" className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-200 transition-colors hover:text-white">Ver política de privacidad <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">FAQ corporativo</p>
              <h2 className="text-[clamp(2.5rem,5vw,4.4rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">Lo esencial antes de empezar.</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <motion.details key={faq.q} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.035 }} className="group overflow-hidden rounded-[1.45rem] border border-white/[0.065] bg-white/[0.025] open:border-indigo-300/15 open:bg-indigo-300/[0.03]">
                  <summary className="cursor-pointer list-none px-5 py-5 text-sm font-extrabold text-slate-100 sm:px-6 [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                  <div className="border-t border-white/[0.05] px-5 pb-6 pt-4 sm:px-6"><p className="text-sm leading-6 text-slate-400">{faq.a}</p></div>
                </motion.details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.09] bg-[#080c14] px-6 py-14 text-center shadow-[0_50px_130px_-65px_rgba(79,70,229,.68)] sm:px-10 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(79,70,229,.25), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-300/80">PreRescue para organizaciones</p>
              <h2 className="text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-[0.88] tracking-[-0.05em] text-slate-50">Cuéntanos cómo trabaja tu equipo.</h2>
              <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">Te mostraremos las opciones disponibles según el tamaño y las necesidades de la organización.</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/contacto?subject=Solicitud%20de%20información%20corporativa" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]">Solicitar información <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/comprar" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-7 text-sm font-bold text-slate-100 transition-all hover:border-indigo-300/25 hover:bg-white/[0.08]">Ver planes</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
