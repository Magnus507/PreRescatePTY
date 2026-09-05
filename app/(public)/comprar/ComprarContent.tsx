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
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="h-full"
    >
      <GlowCard
        customSize
        glowColor={pkg.recommended ? "red" : "blue"}
        className={`h-full min-h-[520px] p-6 sm:p-7 ${pkg.recommended ? "border-[#DA1A21]/25 bg-[#DA1A21]/[0.035]" : ""}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Plan PreRescue ID</p>
                {pkg.recommended && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/15 bg-rose-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-rose-200">
                    <Sparkles className="h-3 w-3" /> Recomendado
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-slate-50">{pkg.name}</h3>
            </div>
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0c1730] to-[#040711] p-2">
              <Image src="/sticker-official.png" alt="" aria-hidden="true" fill sizes="64px" className="object-contain p-2" />
            </div>
          </div>

          <div className="mt-8 border-y border-white/[0.06] py-6">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tracking-[-0.055em] text-white">${pkg.price}</span>
              <span className="pb-1.5 text-xs font-semibold text-slate-600">pago único</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">{pkg.serviceDurationMonths} meses de vigencia desde la activación.</p>
          </div>

          <div className="mt-7 space-y-3">
            {[
              `${pkg.maxChips} chip${pkg.maxChips !== 1 ? "s" : ""} NFC + QR`,
              `${pkg.maxProfiles} perfil${pkg.maxProfiles !== 1 ? "es" : ""} médico${pkg.maxProfiles !== 1 ? "s" : ""}`,
              "Consulta desde navegador compatible",
              pkg.allowsFamilyProfiles ? "Perfiles familiares habilitados" : "Perfil personal",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-sm font-semibold text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <Link
              href={`/registro?package=${pkg.id}`}
              className={`group flex min-h-13 w-full items-center justify-between rounded-2xl px-5 text-sm font-extrabold transition-all ${
                pkg.recommended
                  ? "bg-[#DA1A21] text-white shadow-[0_16px_45px_-20px_rgba(218,26,33,.9)] hover:bg-[#ef2d35]"
                  : "border border-white/[0.09] bg-white/[0.05] text-slate-100 hover:border-sky-300/20 hover:bg-white/[0.08]"
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

        <section className="border-y border-white/[0.055] bg-[#03060c] py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:px-6">
            <span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-emerald-300" /> Pago manual verificado</span>
            <span className="flex items-center gap-2"><QrCode className="h-3.5 w-3.5 text-sky-300" /> QR + NFC</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-indigo-300" /> Sin mensualidad recurrente</span>
          </div>
        </section>

        <section id="planes" className="relative scroll-mt-20 overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(52% 56% at 50% 20%, rgba(37,99,235,.12), transparent 64%), radial-gradient(30% 42% at 86% 78%, rgba(218,26,33,.06), transparent 68%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">Personal y familia</p>
              <h2 className="text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">Producto físico. Perfil digital. Una sola compra.</h2>
              <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg">Compara la capacidad incluida en cada opción antes de crear tu cuenta.</p>
            </div>

            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm font-bold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-300" /> Cargando planes
                </div>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-xl rounded-[1.8rem] border border-rose-300/10 bg-rose-300/[0.035] p-8 text-center">
                <p className="text-base font-extrabold text-slate-100">No pudimos cargar el catálogo.</p>
                <p className="mt-2 text-sm text-slate-500">Puedes contactarnos para obtener información sobre las opciones disponibles.</p>
                <Link href="/contacto" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-bold text-white hover:bg-[#ef2d35]">
                  Contactar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : personalPackages.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[1.8rem] border border-white/[0.07] bg-white/[0.025] p-8 text-center text-sm font-medium text-slate-500">
                No hay planes personales disponibles en este momento.
              </div>
            ) : (
              <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
                {personalPackages.map((pkg, index) => <PackageCard key={pkg.id} pkg={pkg} index={index} />)}
              </div>
            )}

            {companyPackages.length > 0 && (
              <div className="mt-24">
                <div className="mb-12 grid items-end gap-7 lg:grid-cols-[1fr_.72fr]">
                  <div>
                    <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Organizaciones</p>
                    <h3 className="max-w-[11ch] text-[clamp(2.7rem,5vw,4.8rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Cobertura para más de una persona.</h3>
                  </div>
                  <p className="text-base font-medium leading-7 text-slate-400">Opciones pensadas para organizaciones que necesitan gestionar miembros y dispositivos.</p>
                </div>

                <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {companyPackages.map((pkg, index) => (
                    <motion.div key={pkg.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.06 }} className="rounded-[1.8rem] border border-white/[0.07] bg-white/[0.026] p-7">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/12 bg-indigo-300/[0.05]"><UsersRound className="h-5 w-5 text-indigo-300" /></span>
                        {pkg.recommended && <span className="rounded-full border border-rose-300/15 bg-rose-300/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-rose-200">Recomendado</span>}
                      </div>
                      <h4 className="mt-7 text-xl font-black text-slate-50">{pkg.name}</h4>
                      <div className="mt-4 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.05em] text-white">${pkg.price}</span><span className="pb-1 text-xs text-slate-600">pago único</span></div>
                      <div className="mt-7 space-y-3">
                        {[`${pkg.maxChips} chips`, `${pkg.maxProfiles} perfiles`, "Panel administrativo", `${pkg.serviceDurationMonths} meses de vigencia`].map((feature) => (
                          <div key={feature} className="flex items-center gap-2.5 text-sm font-semibold text-slate-400"><Check className="h-4 w-4 text-emerald-300" />{feature}</div>
                        ))}
                      </div>
                      <Link href={`/contacto?subject=${encodeURIComponent("Me interesa " + pkg.name)}`} className="group mt-8 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-bold text-slate-100 transition-all hover:border-indigo-300/20 hover:bg-white/[0.075]">
                        Solicitar información <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/80">Antes de comprar</p>
                <h2 className="max-w-[9ch] text-[clamp(2.7rem,5vw,4.8rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Respuestas claras antes de elegir.</h2>
              </div>
              <div className="space-y-3">
                {purchaseFaq.map((faq, index) => (
                  <motion.details key={faq.q} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.04 }} className="group overflow-hidden rounded-[1.45rem] border border-white/[0.065] bg-white/[0.025] open:border-sky-300/15 open:bg-sky-300/[0.03]">
                    <summary className="cursor-pointer list-none px-5 py-5 text-sm font-extrabold text-slate-100 sm:px-6 [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                    <div className="border-t border-white/[0.05] px-5 pb-6 pt-4 sm:px-6"><p className="text-sm leading-6 text-slate-400">{faq.a}</p></div>
                  </motion.details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Información comercial</p>
              <h2 className="text-[clamp(2.6rem,5vw,4.7rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">Compra con las condiciones a la vista.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {commercialInfo.map((item, index) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.06 }} className="rounded-[1.6rem] border border-white/[0.065] bg-white/[0.026] p-6">
                  <item.icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-7 text-lg font-extrabold text-slate-100">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
                  <Link href={item.href} className="group mt-6 inline-flex items-center gap-2 text-xs font-bold text-sky-200 transition-colors hover:text-white">{item.label}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link>
                </motion.div>
              ))}
            </div>
            <p className="mt-7 text-center text-[10px] font-medium text-slate-600">Redacción comercial provisional pendiente de revisión legal profesional.</p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.09] bg-[#080c14] px-6 py-14 text-center shadow-[0_50px_130px_-65px_rgba(218,26,33,.68)] sm:px-10 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-300/80">PreRescue ID</p>
              <h2 className="text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-[0.88] tracking-[-0.05em] text-slate-50">Prepárate antes de necesitarlo.</h2>
              <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">Elige un plan del catálogo activo y crea tu perfil médico de emergencia.</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="#planes" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]">Ver planes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/contacto" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-7 text-sm font-bold text-slate-100 transition-all hover:border-sky-300/25 hover:bg-white/[0.08]">Necesito ayuda para elegir</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
