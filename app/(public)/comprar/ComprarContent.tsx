"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Loader2, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

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
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Planes claros. Pago único."
          title="Encuentra el plan adecuado para ti, tu familia o tu equipo"
          description="Compara perfiles y chips incluidos. Cada plan ofrece 2 años de vigencia desde la activación."
          primaryCTA={{ href: "#planes", label: "Ver planes" }}
          secondaryCTA={{ href: "/demo", label: "Ver demo" }}
        />

        {/* Payment methods */}
        <section className="py-12 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card-w2a rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
              <CreditCard className="h-8 w-8 text-[#10B981]" />
              <div>
                <p className="text-sm font-bold text-[#EFF4FF]">Métodos de pago</p>
                <p className="text-xs text-[#A0AEC0]">
                  Puedes pagar con tarjeta a través de Stripe o enviar un comprobante de pago manual mediante los métodos disponibles en la plataforma.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Personal packages */}
        <section id="planes" className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
                Planes personales y familiares
              </h2>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
                Pago único. Sin mensualidades. 2 años de vigencia.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-[#DA1A21]" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#6B7280] font-medium mb-4">Error al cargar los planes.</p>
                <Link href="/contacto" className="btn-premium inline-block px-6 py-3 rounded-xl bg-slate-900 text-white font-bold">
                  Contactar para más información
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {personalPackages.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className={`relative rounded-3xl p-8 border ${
                      pkg.recommended
                        ? "bg-slate-900 text-white border-slate-700 shadow-xl"
                        : "bg-white border-slate-200 shadow-sm"
                    }`}
                  >
                    {pkg.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#DA1A21] text-white text-xs font-bold">
                        Más popular
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                    <p className={`text-3xl font-black mb-1 ${pkg.recommended ? "text-white" : "text-slate-900"}`}>
                      ${pkg.price}
                    </p>
                    <p className={`text-sm mb-6 ${pkg.recommended ? "text-slate-300" : "text-slate-600"}`}>
                      pago único
                    </p>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.recommended ? "text-[#10B981]" : "text-[#DA1A21]"}`} />
                        <span className={pkg.recommended ? "text-slate-200" : "text-slate-700"}>
                          {pkg.maxChips} chip{pkg.maxChips !== 1 ? "s" : ""} NFC
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.recommended ? "text-[#10B981]" : "text-[#DA1A21]"}`} />
                        <span className={pkg.recommended ? "text-slate-200" : "text-slate-700"}>
                          {pkg.maxProfiles} perfil{pkg.maxProfiles !== 1 ? "es" : ""} médico{pkg.maxProfiles !== 1 ? "s" : ""}
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.recommended ? "text-[#10B981]" : "text-[#DA1A21]"}`} />
                        <span className={pkg.recommended ? "text-slate-200" : "text-slate-700"}>QR + NFC</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.recommended ? "text-[#10B981]" : "text-[#DA1A21]"}`} />
                        <span className={pkg.recommended ? "text-slate-200" : "text-slate-700"}>
                          {pkg.serviceDurationMonths / 12} año{pkg.serviceDurationMonths / 12 !== 1 ? "s" : ""} de cobertura
                        </span>
                      </li>
                    </ul>
                    <Link
                      href={`/registro?package=${pkg.id}`}
                      className={`block w-full text-center py-3 rounded-xl font-bold transition-all ${
                        pkg.recommended
                          ? "bg-[#DA1A21] text-white hover:bg-[#B9141B]"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      Adquirir
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {companyPackages.length > 0 && (
              <>
                <div className="text-center mt-20 mb-12">
                  <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tighter text-slate-900">
                    Planes empresariales
                  </h3>
                  <p className="text-[#6B7280] font-medium mt-2">
                    Para empresas, escuelas e instituciones
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {companyPackages.map((pkg, i) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
                    >
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                      <p className="text-3xl font-black text-slate-900 mb-1">${pkg.price}</p>
                      <p className="text-sm text-slate-600 mb-6">pago único</p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 text-[#DA1A21]" />
                          {pkg.maxChips} chips
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 text-[#DA1A21]" />
                          {pkg.maxProfiles} perfiles
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 text-[#DA1A21]" />
                          Panel administrativo
                        </li>
                      </ul>
                      <Link
                        href={`/contacto?subject=${encodeURIComponent("Me interesa " + pkg.name)}`}
                        className="block w-full text-center py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                      >
                        Solicitar información
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Purchase FAQ */}
        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-12 text-center">
              Preguntas sobre compra
            </h2>
            <div className="space-y-4">
              {[
                { q: "¿Qué métodos de pago aceptan?", a: "Puedes pagar con tarjeta a través de Stripe o enviar un comprobante de pago manual mediante los métodos disponibles en la plataforma." },
                { q: "¿Hay mensualidades?", a: "No. Todos los planes son de pago único con 2 años de vigencia desde la activación." },
                { q: "¿Cuánto tiempo dura el servicio?", a: "Cada plan incluye 2 años de cobertura desde la fecha de activación del chip." },
                { q: "¿Necesito instalar una aplicación?", a: "No. El perfil se abre en el navegador del celular. No requiere instalar ninguna aplicación." },
                { q: "¿El sticker necesita batería?", a: "No. El sticker no tiene batería. El chip NFC se activa con la energía del celular que lo escanea." },
                { q: "¿Se necesita internet?", a: "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker no necesita batería ni conexión." },
              ].map((faq, i) => (
                <motion.div
                  key={faq.q}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="glass-card-w2a rounded-2xl p-6"
                >
                  <h3 className="text-base font-bold text-[#EFF4FF] mb-2">{faq.q}</h3>
                  <p className="text-sm text-[#A0AEC0] leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Policy summary */}
        <section className="py-16 bg-[#05070D]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-black text-[#EFF4FF] mb-8 text-center">
              Información comercial
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-card-w2a rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#EFF4FF] mb-3">Envíos</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed">
                  Realizamos entregas dentro de Panamá, sujetas a la cobertura del transportista. El costo y plazo estimado se informan antes de confirmar el pedido. Despacho: 1 a 3 días hábiles. Entrega: 1 a 5 días hábiles según destino.
                </p>
                <Link href="/legal/envios" className="inline-block mt-4 text-sm text-[#DA1A21] hover:text-white underline">
                  Ver política de envíos
                </Link>
              </div>

              <div className="glass-card-w2a rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#EFF4FF] mb-3">Devoluciones</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed">
                  Puedes cancelar antes del despacho. Productos sin abrir, sin usar y sin activar: 7 días calendario para devolución. Chips activados no son reembolsables por cambio de opinión.
                </p>
                <Link href="/legal/reembolsos" className="inline-block mt-4 text-sm text-[#DA1A21] hover:text-white underline">
                  Ver política de reembolsos
                </Link>
              </div>

              <div className="glass-card-w2a rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#EFF4FF] mb-3">Garantía</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed">
                  Garantía de 1 año por defectos de fabricación. Cubre NFC ilegible, QR ilegible por defecto de impresión y fallos de adhesivo en primer uso. No cubre pérdida, robo o daños por uso inadecuado.
                </p>
                <Link href="/legal/garantia" className="inline-block mt-4 text-sm text-[#DA1A21] hover:text-white underline">
                  Ver garantía y reemplazos
                </Link>
              </div>

              <div className="glass-card-w2a rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#EFF4FF] mb-3">Vigencia del servicio</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed">
                  El servicio tiene una vigencia de 2 años desde la activación. Antes de finalizar este período se informarán las opciones disponibles para continuar el servicio. Actualmente no existe renovación automática.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#6B7280] text-center mt-8">
              Provisional commercial wording — pending legal review
            </p>
          </div>
        </section>

        {/* Corporate contact */}
        <section className="py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
              ¿Necesitas un plan empresarial?
            </h2>
            <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto mb-8">
              Escríbenos para conocer opciones de compra por volumen, implementación y gestión administrativa.
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
            >
              Contactar a ventas
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 bg-[#DA1A21]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] text-white mb-6">
              Tu información puede ayudarte a comunicar lo importante.
            </h2>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Crea tu perfil médico de emergencia y elige qué información estará disponible al escanear tu identificación.
            </p>
            <Link
              href="#planes"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
            >
              Ver planes
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}