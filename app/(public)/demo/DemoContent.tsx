"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  const [isMobile, setIsMobile] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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

  const ambientMotion = !reduceMotion && !isMobile;

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

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(48% 60% at 70% 42%, rgba(37,99,235,.15), transparent 62%), radial-gradient(38% 48% at 22% 76%, rgba(218,26,33,.07), transparent 66%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-9 sm:gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200 sm:text-[10px] sm:tracking-[0.18em]">
                  <ScanLine className="h-3.5 w-3.5" /> Prueba real del flujo
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
                  Escanea el QR y abre el perfil.
                </h2>
                <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
                  El código apunta a un perfil de demostración dentro del mismo sistema. Los datos que verás son ficticios.
                </p>

                <div className="mt-6 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-[1.1rem] border border-white/[0.065] bg-white/[0.026] p-4 sm:rounded-2xl">
                    <Eye className="h-4 w-4 text-emerald-300" />
                    <p className="mt-2.5 text-sm font-extrabold text-slate-100 sm:mt-3">Información ficticia</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-1.5">La demo no contiene datos médicos reales.</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/[0.065] bg-white/[0.026] p-4 sm:rounded-2xl">
                    <ShieldCheck className="h-4 w-4 text-sky-300" />
                    <p className="mt-2.5 text-sm font-extrabold text-slate-100 sm:mt-3">Vista pública</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-1.5">Los campos reales dependen de la configuración del perfil.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                className="relative min-h-[430px] sm:min-h-[560px]"
              >
                <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-[75px] sm:h-[70%] sm:w-[70%] sm:bg-blue-500/20 sm:blur-[100px]" />

                <div className="absolute left-[1%] top-[10%] z-20 w-[49%] rounded-[1.4rem] border border-white/[0.09] bg-[#f8fafc] p-3 shadow-[0_30px_75px_-30px_rgba(0,0,0,.95)] sm:left-[7%] sm:top-[12%] sm:w-[43%] sm:rounded-[1.9rem] sm:p-5 sm:shadow-[0_38px_90px_-32px_rgba(0,0,0,.95)]">
                  <div className="mb-2 flex items-center justify-between sm:mb-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[9px] sm:tracking-[0.16em]">Escanea aquí</span>
                    <QrCode className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-3">
                    <div className="flex h-full items-center justify-center">
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300 sm:h-9 sm:w-9" />
                      ) : qrUrl ? (
                        <Image src={qrUrl} alt="Código QR de demostración" width={320} height={320} unoptimized className="h-full w-full object-contain" />
                      ) : (
                        <QrCode className="h-16 w-16 text-slate-300 sm:h-24 sm:w-24" />
                      )}
                    </div>
                    {ambientMotion && (
                      <motion.div
                        aria-hidden="true"
                        animate={{ y: ["-20%", "440%"] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: "linear", repeatDelay: 1.1 }}
                        className="absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_18px_rgba(14,165,233,.95)]"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-center text-[8px] font-bold text-slate-400 sm:mt-3 sm:text-[9px]">Perfil ficticio · Demo</p>
                </div>

                <div className="absolute bottom-[2%] right-[0%] z-30 w-[60%] overflow-hidden rounded-[1.7rem] border border-white/[0.11] bg-[#070b12] p-1.5 shadow-[0_36px_80px_-34px_rgba(0,0,0,.98)] sm:bottom-[3%] sm:right-[6%] sm:w-[53%] sm:rounded-[2.35rem] sm:p-2 sm:shadow-[0_45px_100px_-35px_rgba(0,0,0,.98)]">
                  <div className="rounded-[1.35rem] border border-white/[0.06] bg-gradient-to-b from-[#101b2d] to-[#070a10] p-3 sm:rounded-[1.9rem] sm:p-5">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10 sm:mb-5 sm:h-1.5 sm:w-14" />
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20 sm:h-10 sm:w-10 sm:rounded-2xl">
                          <HeartPulse className="h-4 w-4 text-rose-300 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[8px] sm:tracking-[0.16em]">PreRescue ID</p>
                          <p className="mt-0.5 truncate text-[11px] font-extrabold text-white sm:mt-1 sm:text-sm">Perfil de emergencia</p>
                        </div>
                      </div>
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-5 sm:gap-2">
                      {[
                        ["Tipo de sangre", "O+"],
                        ["Alergias", "Visible"],
                        ["Condiciones", "Visible"],
                        ["Contacto", "Disponible"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/[0.055] bg-white/[0.03] p-2 sm:rounded-xl sm:p-3">
                          <p className="truncate text-[6px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[8px]">{label}</p>
                          <p className="mt-0.5 text-[8px] font-bold text-slate-200 sm:mt-1 sm:text-[10px]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-9 sm:gap-12 lg:grid-cols-[.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/80 sm:text-[10px] sm:tracking-[0.2em]">Contenido de la demo</p>
                <h2 className="max-w-[9ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)] sm:leading-[0.91]">Una muestra del tipo de información disponible.</h2>
                <p className="mt-5 max-w-md text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">La disponibilidad de cada campo depende de la configuración del perfil real.</p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {demoFields.map((field, index) => (
                  <motion.div key={field} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.38, delay: index * 0.035 }} className="flex min-h-[52px] items-center justify-between rounded-[1.05rem] border border-white/[0.065] bg-white/[0.026] px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
                    <span className="text-[13px] font-bold text-slate-300 sm:text-sm">{field}</span>
                    <Eye className="h-4 w-4 shrink-0 text-emerald-300/60" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:gap-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
              <MessageCircle className="h-5 w-5 text-sky-300" />
              <h2 className="mt-5 text-[1.7rem] font-black leading-tight tracking-[-0.04em] text-slate-50 sm:mt-7 sm:text-3xl">Contacto iniciado por quien escanea</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">
                El perfil puede incluir botones para llamar o abrir WhatsApp. La persona que realiza el escaneo inicia la acción.
              </p>
              <p className="mt-4 text-xs leading-5 text-slate-600 sm:mt-5">Si el navegador concede permiso de ubicación, el flujo habilitado puede utilizar una posición aproximada.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.028] p-5 sm:rounded-[2rem] sm:p-9">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-5 text-[1.7rem] font-black leading-tight tracking-[-0.04em] text-slate-50 sm:mt-7 sm:text-3xl">Demo segura y separada</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">Esta demostración usa información de ejemplo. En una cuenta real, cada usuario configura la información visible.</p>
              <Link href="/legal/privacidad" className="group mt-4 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-emerald-200 transition-colors active:text-white sm:mt-6 sm:min-h-0 sm:hover:text-white">Política de privacidad <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.27), transparent 64%), radial-gradient(42% 70% at 80% 10%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-rose-300/80 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">Pruébalo ahora</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.4rem)] sm:leading-[0.88]">Abre el perfil de demostración.</h2>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link href="/e/DEMO-ADMIN-VIP?demo=true" target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]">Abrir demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/comprar" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:hover:border-sky-300/25 sm:hover:bg-white/[0.08]">Crear mi perfil</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
