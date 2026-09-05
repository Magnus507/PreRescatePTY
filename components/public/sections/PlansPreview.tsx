"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";

interface Package {
  id: string;
  name: string;
  slug: string | null;
  maxChips: number;
  maxProfiles: number;
  price: number;
  description: string | null;
  isActive: boolean;
  accountType: string;
  icon: string | null;
  color: string | null;
  recommended: boolean;
  displayOrder: number;
  savings: string | null;
  allowsFamilyProfiles: boolean;
  allowsOrganizationModule: boolean;
  serviceDurationMonths: number;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function coverageLabel(months: number) {
  if (months > 0 && months % 12 === 0) {
    const years = months / 12;
    return `${years} año${years === 1 ? "" : "s"}`;
  }
  return `${months} meses`;
}

export default function PlansPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

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
  }, [shouldLoad]);

  const displayPackages = packages.slice(0, 3);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 52% at 50% 24%, rgba(37,99,235,.12), transparent 62%), radial-gradient(30% 42% at 78% 78%, rgba(218,26,33,.07), transparent 66%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-sky-200 sm:mb-5 sm:text-[10px] sm:tracking-[0.18em]">
            <Sparkles className="h-3.5 w-3.5" />
            Planes PreRescue ID
          </div>
          <h2 className="text-[clamp(2.4rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.92]">
            Elige la cobertura que necesitas.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-7">
            Los planes, precios y límites se cargan directamente desde nuestro catálogo activo.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center sm:min-h-[360px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm font-bold text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
              Cargando planes
            </div>
          </div>
        ) : error || displayPackages.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:rounded-[1.7rem] sm:p-8">
            <p className="font-medium text-slate-400">
              {error ? "No pudimos cargar los planes en este momento." : "No hay planes disponibles en este momento."}
            </p>
            <Link href="/comprar" className="mt-5 inline-flex min-h-[48px] touch-manipulation items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
              Ver página de compra <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 md:grid-cols-3">
            {displayPackages.map((pkg, index) => {
              const serviceLabel = coverageLabel(pkg.serviceDurationMonths);
              const features = [
                `${pkg.maxChips} chip${pkg.maxChips === 1 ? "" : "s"} QR + NFC`,
                `${pkg.maxProfiles} perfil${pkg.maxProfiles === 1 ? "" : "es"} médico${pkg.maxProfiles === 1 ? "" : "s"}`,
                "Contactos de emergencia",
                `${serviceLabel} de servicio desde la activación`,
              ];

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className={pkg.recommended ? "md:-translate-y-3" : ""}
                >
                  <GlowCard customSize glowColor={pkg.recommended ? "red" : "blue"} className={`h-full p-5 sm:min-h-[500px] sm:p-7 ${pkg.recommended ? "border-[#DA1A21]/25 bg-[#DA1A21]/[0.035]" : ""}`}>
                    <div className="flex h-full flex-col">
                      <div className="flex min-h-7 items-center justify-between gap-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">{pkg.accountType || "PreRescue"}</span>
                        {pkg.recommended && (
                          <span className="rounded-full border border-[#DA1A21]/25 bg-[#DA1A21]/10 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-rose-200 sm:px-3 sm:text-[9px] sm:tracking-[0.12em]">Más popular</span>
                        )}
                      </div>

                      <h3 className="mt-5 text-[22px] font-black tracking-[-0.035em] text-white sm:mt-7 sm:text-2xl">{pkg.name}</h3>
                      {pkg.description && <p className="mt-2.5 text-sm leading-6 text-slate-500 sm:mt-3 sm:min-h-12">{pkg.description}</p>}

                      <div className="mt-5 flex items-end gap-2 border-y border-white/[0.06] py-5 sm:mt-7 sm:py-6">
                        <span className="text-4xl font-black tracking-[-0.05em] text-slate-50 sm:text-5xl">{priceFormatter.format(pkg.price)}</span>
                        <span className="pb-1 text-[11px] font-semibold text-slate-500 sm:pb-1.5 sm:text-xs">pago del plan</span>
                      </div>

                      {pkg.savings && (
                        <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] px-3 py-2 text-xs font-bold text-emerald-300 sm:mt-4">{pkg.savings}</div>
                      )}

                      <ul className="mt-5 space-y-3 sm:mt-7 sm:space-y-3.5">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm leading-5 text-slate-300">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${pkg.recommended ? "bg-[#DA1A21]/12 text-rose-300" : "bg-sky-300/[0.08] text-sky-300"}`}>
                              <Check className="h-3 w-3" />
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={pkg.accountType === "company" ? `/contacto?subject=Me%20interesa%20el%20${encodeURIComponent(pkg.name)}` : `/registro?package=${pkg.id}`}
                        className={`mt-6 flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition-all duration-300 sm:mt-auto sm:min-h-12 ${
                          pkg.recommended
                            ? "bg-[#DA1A21] text-white shadow-[0_18px_42px_-18px_rgba(218,26,33,.75)] active:bg-[#ef2d35] sm:hover:bg-[#ef2d35]"
                            : "border border-white/[0.09] bg-white/[0.055] text-slate-100 active:bg-white/[0.09] sm:hover:border-sky-300/20 sm:hover:bg-white/[0.09]"
                        }`}
                      >
                        {pkg.accountType === "company" ? "Solicitar información" : "Elegir este plan"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </GlowCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && !error && packages.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-9 text-center sm:mt-11"
          >
            <Link href="/comprar" className="group inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-sky-200 transition-colors active:text-white sm:hover:text-white">
              Comparar todos los planes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
