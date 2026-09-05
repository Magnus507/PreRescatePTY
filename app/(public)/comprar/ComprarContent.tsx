"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { GlowCard } from "@/components/ui/spotlight-card";

interface Package {
  id: string;
  name: string;
  maxChips: number;
  maxProfiles: number;
  price: number;
  isActive: boolean;
  accountType: string;
  recommended: boolean;
  allowsFamilyProfiles: boolean;
  allowsOrganizationModule: boolean;
  serviceDurationMonths: number;
}

const purchaseFaq = [
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Todos los pedidos se pagan de forma manual mediante instrucciones bancarias, comprobante y revisión administrativa.",
  },
  {
    q: "¿Hay mensualidades?",
    a: "Los planes mostrados son de pago único. La vigencia incluida se indica en cada opción disponible.",
  },
  {
    q: "¿Necesito instalar una aplicación?",
    a: "No. El perfil se abre en el navegador del teléfono compatible.",
  },
  {
    q: "¿El sticker necesita batería?",
    a: "No. El identificador físico no necesita batería propia.",
  },
  {
    q: "¿Se necesita internet?",
    a: "El dispositivo que consulta el perfil necesita conexión a internet. El sticker no necesita conexión propia.",
  },
];

const commercialInfo = [
  {
    icon: PackageCheck,
    title: "Envíos",
    text: "Realizamos entregas dentro de Panamá, sujetas a cobertura del transportista. El costo y plazo estimado se informan antes de confirmar el pedido.",
    href: "/legal/envios",
    label: "Política de envíos",
  },
  {
    icon: CreditCard,
    title: "Cancelaciones y devoluciones",
    text: "Puedes cancelar antes del despacho. Los productos elegibles para devolución deben cumplir las condiciones indicadas en nuestra política vigente.",
    href: "/legal/reembolsos",
    label: "Política de reembolsos",
  },
  {
    icon: ShieldCheck,
    title: "Garantía",
    text: "La garantía cubre los defectos de fabricación descritos en nuestras condiciones y excluye pérdida, robo y daños derivados de un uso inadecuado.",
    href: "/legal/garantia",
    label: "Garantía y reemplazos",
  },
];

function PackageCard({ pkg, index }: { pkg: Package; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-45px" }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="h-full"
    >
      <GlowCard
        customSize
        glowColor={pkg.recommended ? "red" : "blue"}
        className={`h-full p-5 sm:min-h-[520px] sm:p-7 ${pkg.recommended ? "border-[#DA1A21]/25 bg-[#DA1A21]/[0.035]" : ""}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-[10px] sm:tracking-[0.18em]">Plan PreRescue ID</p>
                {pkg.recommended && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/15 bg-rose-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-rose-200">
                    <Sparkles className="h-3 w-3" /> Recomendado
                  </span>
                )}
              </div>
              <h3 className="mt-2.5 text-[22px] font-black tracking-[-0.035em] text-slate-50 sm:mt-3 sm:text-2xl">{pkg.name}</h3>
            </div>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#0c1730] to-[#040711] p-1.5 sm:h-16 sm:w-16 sm:rounded-2xl sm:p-2">
              <Image src="/sticker-official.png" alt="" aria-hidden="true" fill sizes="64px" className="object-contain p-2" />
            </div>
          </div>

          <div className="mt-5 border-y border-white/[0.06] py-5 sm:mt-8 sm:py-6">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">${pkg.price}</span>
              <span className="pb-1 text-[11px] font-semibold text-slate-600 sm:pb-1.5 sm:text-xs">pago único</span>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500 sm:text-xs">{pkg.serviceDurationMonths} meses de vigencia desde la activación.</p>
          </div>

          <div className="mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
            {[
              `${pkg.maxChips} chip${pkg.maxChips !== 1 ? "s" : ""} NFC + QR`,
              `${pkg.maxProfiles} perfil${pkg.maxProfiles !== 1 ? "es" : ""} médico${pkg.maxProfiles !== 1 ? "s" : ""}`,
              "Consulta desde navegador compatible",
              pkg.allowsFamilyProfiles ? "Perfiles familiares habilitados" : "Perfil personal",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-slate-300 sm:text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-auto sm:pt-8">
            <Link
              href={`/registro?package=${pkg.id}`}
              className={`group flex min-h-[52px] w-full touch-manipulation items-center justify-between rounded-2xl px-5 text-sm font-extrabold transition-all active:scale-[0.99] ${
                pkg.recommended
                  ? "bg-[#DA1A21] text-white shadow-[0_16px_45px_-20px_rgba(218,26,33,.9)] active:bg-[#ef2d35] sm:hover:bg-[#ef2d35]"
                  : "border border-white/[0.09] bg-white/[0.05] text-slate-100 active:bg-white/[0.08] sm:hover:border-sky-300/20 sm:hover:bg-white/[0.08]"
              }`}
            >
              Adquirir {pkg.name}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

export default function ComprarContent() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/public/packages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setPackages(data.packages || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const personalPackages = packages.filter((p) => p.accountType === "personal");
  const companyPackages = packages.filter((p) => p.accountType === "company");

  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Planes claros · Pago único"
          title="Elige la identificación que"
          titleAccent="mejor encaja contigo."
          description="Los precios, capacidades y vigencia que ves aquí se cargan directamente desde nuestro catálogo activo."
          primaryCTA={{ href: "#planes", label: "Ver planes" }}
          secondaryCTA={{ href: "/demo", label: "Ver demo" }}
        />

        <section className="border-y border-white/[0.055] bg-[#03060c] py-3.5 sm:py-5">
          <div className="mx-auto flex max-w-5xl snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-x-7 sm:gap-y-3 sm:px-6">
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><CreditCard className="h-3.5 w-3.5 text-emerald-300" /> Pago manual verificado</span>
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><QrCode className="h-3.5 w-3.5 text-sky-300" /> QR + NFC</span>
            <span className="flex min-h-10 shrink-0 snap-start items-center gap-2 rounded-full border border-white/[0.055] bg-white/[0.02] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[10px] sm:tracking-[0.14em]"><ShieldCheck className="h-3.5 w-3.5 text-indigo-300" /> Sin mensualidad recurrente</span>
          </div>
        </section>

        <section id="planes" className="relative scroll-mt-20 overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(52% 56% at 50% 20%, rgba(37,99,235,.12), transparent 64%), radial-gradient(30% 42% at 86% 78%, rgba(218,26,33,.06), transparent 68%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Personal y familia</p>
              <h2 className="text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.92]">Producto físico. Perfil digital. Una sola compra.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-7">Compara la capacidad incluida en cada opción antes de crear tu cuenta.</p>
            </div>

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center sm:min-h-[360px]">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm font-bold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-300" /> Cargando planes
                </div>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-xl rounded-[1.5rem] border border-rose-300/10 bg-rose-300/[0.035] p-6 text-center sm:rounded-[1.8rem] sm:p-8">
                <p className="text-base font-extrabold text-slate-100">No pudimos cargar el catálogo.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Puedes contactarnos para obtener información sobre las opciones disponibles.</p>
                <Link href="/contacto" className="mt-5 inline-flex min-h-[52px] touch-manipulation items-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-bold text-white active:bg-[#ef2d35] sm:mt-6 sm:min-h-12 sm:hover:bg-[#ef2d35]">
                  Contactar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : personalPackages.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-6 text-center text-sm font-medium text-slate-500 sm:rounded-[1.8rem] sm:p-8">
                No hay planes personales disponibles en este momento.
              </div>
            ) : (
              <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {personalPackages.map((pkg, index) => <PackageCard key={pkg.id} pkg={pkg} index={index} />)}
              </div>
            )}

            {companyPackages.length > 0 && (
              <div className="mt-16 sm:mt-24">
                <div className="mb-9 grid items-end gap-5 sm:mb-12 sm:gap-7 lg:grid-cols-[1fr_.72fr]">
                  <div>
                    <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300/80 sm:text-[10px] sm:tracking-[0.2em]">Organizaciones</p>
                    <h3 className="max-w-[11ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">Cobertura para más de una persona.</h3>
                  </div>
                  <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-base sm:leading-7">Opciones pensadas para organizaciones que necesitan gestionar miembros y dispositivos.</p>
                </div>

                <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {companyPackages.map((pkg, index) => (
                    <motion.div key={pkg.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, delay: index * 0.05 }} className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.026] p-5 sm:rounded-[1.8rem] sm:p-7">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-300/12 bg-indigo-300/[0.05] sm:h-11 sm:w-11 sm:rounded-2xl"><UsersRound className="h-[18px] w-[18px] text-indigo-300 sm:h-5 sm:w-5" /></span>
                        {pkg.recommended && <span className="rounded-full border border-rose-300/15 bg-rose-300/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-rose-200">Recomendado</span>}
                      </div>
                      <h4 className="mt-5 text-xl font-black text-slate-50 sm:mt-7">{pkg.name}</h4>
                      <div className="mt-3 flex items-end gap-2 sm:mt-4"><span className="text-4xl font-black tracking-[-0.05em] text-white">${pkg.price}</span><span className="pb-1 text-xs text-slate-600">pago único</span></div>
                      <div className="mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
                        {[`${pkg.maxChips} chips`, `${pkg.maxProfiles} perfiles`, "Panel administrativo", `${pkg.serviceDurationMonths} meses de vigencia`].map((feature) => (
                          <div key={feature} className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-400 sm:text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-300" />{feature}</div>
                        ))}
                      </div>
                      <Link href={`/contacto?subject=${encodeURIComponent("Me interesa " + pkg.name)}`} className="group mt-6 flex min-h-[52px] w-full touch-manipulation items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.075] sm:mt-8 sm:min-h-12 sm:hover:border-indigo-300/20 sm:hover:bg-white/[0.075]">
                        Solicitar información <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-9 sm:gap-12 lg:grid-cols-[.7fr_1.3fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px] sm:tracking-[0.2em]">Antes de comprar</p>
                <h2 className="max-w-[9ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">Respuestas claras antes de elegir.</h2>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                {purchaseFaq.map((faq, index) => (
                  <motion.details key={faq.q} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.38, delay: index * 0.035 }} className="group overflow-hidden rounded-[1.15rem] border border-white/[0.065] bg-white/[0.025] open:border-sky-300/15 open:bg-sky-300/[0.03] sm:rounded-[1.45rem]">
                    <summary className="flex min-h-[60px] touch-manipulation cursor-pointer list-none items-center px-4 py-4 text-[13px] font-extrabold leading-5 text-slate-100 sm:min-h-0 sm:px-6 sm:py-5 sm:text-sm [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                    <div className="border-t border-white/[0.05] px-4 pb-5 pt-3.5 sm:px-6 sm:pb-6 sm:pt-4"><p className="text-sm leading-6 text-slate-400">{faq.a}</p></div>
                  </motion.details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-9 text-center sm:mb-12">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/80 sm:text-[10px] sm:tracking-[0.2em]">Información comercial</p>
              <h2 className="text-[clamp(2.3rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.6rem,5vw,4.7rem)] sm:leading-[0.92]">Compra con las condiciones a la vista.</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              {commercialInfo.map((item, index) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.05 }} className="rounded-[1.35rem] border border-white/[0.065] bg-white/[0.026] p-5 sm:rounded-[1.6rem] sm:p-6">
                  <item.icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-5 text-base font-extrabold text-slate-100 sm:mt-7 sm:text-lg">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-500 sm:mt-3">{item.text}</p>
                  <Link href={item.href} className="group mt-4 inline-flex min-h-10 touch-manipulation items-center gap-2 text-xs font-bold text-sky-200 transition-colors active:text-white sm:mt-6 sm:min-h-0 sm:hover:text-white">{item.label}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link>
                </motion.div>
              ))}
            </div>
            <p className="mt-6 text-center text-[9px] font-medium leading-5 text-slate-600 sm:mt-7 sm:text-[10px]">Redacción comercial provisional pendiente de revisión legal profesional.</p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center shadow-[0_42px_110px_-65px_rgba(218,26,33,.62)] sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20 md:shadow-[0_50px_130px_-65px_rgba(218,26,33,.68)]">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-300/80 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">PreRescue ID</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.6rem)] sm:leading-[0.88]">Prepárate antes de necesitarlo.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8">Elige un plan del catálogo activo y crea tu perfil médico de emergencia.</p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link href="#planes" className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]">Ver planes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/contacto" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:border-sky-300/25 sm:hover:bg-white/[0.08]">Necesito ayuda para elegir</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
