"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  HeartPulse,
  Loader2,
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";

const demoFields = [
  "Nombre y foto",
  "Tipo de sangre",
  "Alergias",
  "Condiciones médicas",
  "Medicamentos",
  "Contactos de emergencia",
  "Instrucciones de comunicación",
  "Retorno seguro",
];

export default function DemoPage() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const demoUrl = `${window.location.origin}/e/DEMO-ADMIN-VIP?demo=true`;
    fetch(`/api/public/qr?data=${encodeURIComponent(demoUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setQrUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Demo en vivo"
          title="No tienes que imaginarlo."
          titleAccent="Escanéalo."
          description="Prueba un perfil ficticio de emergencia y observa cómo se presenta la información pública desde un teléfono compatible."
          primaryCTA={{ href: "/e/DEMO-ADMIN-VIP?demo=true", label: "Abrir perfil demo" }}
          secondaryCTA={{ href: "/como-funciona", label: "Cómo funciona" }}
        />

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(48% 60% at 70% 42%, rgba(37,99,235,.15), transparent 62%), radial-gradient(38% 48% at 22% 76%, rgba(218,26,33,.07), transparent 66%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
                  <ScanLine className="h-3.5 w-3.5" /> Prueba real del flujo
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
                  Escanea el QR y abre el perfil.
                </h2>
                <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
                  El código apunta a un perfil de demostración dentro del mismo sistema. Los datos que verás son ficticios.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.065] bg-white/[0.026] p-4">
                    <Eye className="h-4 w-4 text-emerald-300" />
                    <p className="mt-3 text-sm font-extrabold text-slate-100">Información ficticia</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">La demo no contiene datos médicos reales.</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.065] bg-white/[0.026] p-4">
                    <ShieldCheck className="h-4 w-4 text-sky-300" />
                    <p className="mt-3 text-sm font-extrabold text-slate-100">Vista pública</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">Los campos reales dependen de la configuración del perfil.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative min-h-[560px]"
              >
                <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[100px]" />

                <div className="absolute left-[2%] top-[12%] z-20 w-[48%] rounded-[1.9rem] border border-white/[0.09] bg-[#f8fafc] p-4 shadow-[0_38px_90px_-32px_rgba(0,0,0,.95)] sm:left-[7%] sm:w-[43%] sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Escanea aquí</span>
                    <QrCode className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex h-full items-center justify-center">
                      {loading ? (
                        <Loader2 className="h-9 w-9 animate-spin text-slate-300" />
                      ) : qrUrl ? (
                        <Image src={qrUrl} alt="Código QR de demostración" width={320} height={320} unoptimized className="h-full w-full object-contain" />
                      ) : (
                        <QrCode className="h-24 w-24 text-slate-300" />
                      )}
                    </div>
                    <motion.div
                      aria-hidden="true"
                      animate={{ y: ["-20%", "440%"] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "linear", repeatDelay: 1.1 }}
                      className="absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_18px_rgba(14,165,233,.95)]"
                    />
                  </div>
                  <p className="mt-3 text-center text-[9px] font-bold text-slate-400">Perfil ficticio · Demo</p>
                </div>

                <div className="absolute bottom-[3%] right-[1%] z-30 w-[59%] overflow-hidden rounded-[2.35rem] border border-white/[0.11] bg-[#070b12] p-2 shadow-[0_45px_100px_-35px_rgba(0,0,0,.98)] sm:right-[6%] sm:w-[53%]">
                  <div className="rounded-[1.9rem] border border-white/[0.06] bg-gradient-to-b from-[#101b2d] to-[#070a10] p-4 sm:p-5">
                    <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/10" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20">
                          <HeartPulse className="h-5 w-5 text-rose-300" />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">PreRescue ID</p>
                          <p className="mt-1 text-sm font-extrabold text-white">Perfil de emergencia</p>
                        </div>
                      </div>
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {[
                        ["Tipo de sangre", "O+"],
                        ["Alergias", "Visible"],
                        ["Condiciones", "Visible"],
                        ["Contacto", "Disponible"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.055] bg-white/[0.03] p-3">
                          <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-200">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Contenido de la demo</p>
                <h2 className="max-w-[9ch] text-[clamp(2.7rem,5vw,4.8rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">Una muestra del tipo de información disponible.</h2>
                <p className="mt-6 max-w-md text-base font-medium leading-7 text-slate-400">La disponibilidad de cada campo depende de la configuración del perfil real.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {demoFields.map((field, index) => (
                  <motion.div key={field} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.04 }} className="flex items-center justify-between rounded-2xl border border-white/[0.065] bg-white/[0.026] px-5 py-4">
                    <span className="text-sm font-bold text-slate-300">{field}</span>
                    <Eye className="h-4 w-4 text-emerald-300/60" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9">
              <MessageCircle className="h-5 w-5 text-sky-300" />
              <h2 className="mt-7 text-3xl font-black tracking-[-0.04em] text-slate-50">Contacto iniciado por quien escanea</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                El perfil puede incluir botones para llamar o abrir WhatsApp. La persona que realiza el escaneo inicia la acción.
              </p>
              <p className="mt-5 text-xs leading-5 text-slate-600">Si el navegador concede permiso de ubicación, el flujo habilitado puede utilizar una posición aproximada.</p>
            </div>

            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-7 sm:p-9">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-7 text-3xl font-black tracking-[-0.04em] text-slate-50">Demo segura y separada</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">Esta demostración usa información de ejemplo. En una cuenta real, cada usuario configura la información visible.</p>
              <Link href="/legal/privacidad" className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-200 transition-colors hover:text-white">Política de privacidad <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/[0.09] bg-[#080c14] px-6 py-14 text-center sm:px-10 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.27), transparent 64%), radial-gradient(42% 70% at 80% 10%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-rose-300/80">Pruébalo ahora</p>
              <h2 className="text-[clamp(2.8rem,6vw,5.4rem)] font-black leading-[0.88] tracking-[-0.05em] text-slate-50">Abre el perfil de demostración.</h2>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/e/DEMO-ADMIN-VIP?demo=true" target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]">Abrir demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/comprar" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-7 text-sm font-bold text-slate-100 transition-all hover:border-sky-300/25 hover:bg-white/[0.08]">Crear mi perfil</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
