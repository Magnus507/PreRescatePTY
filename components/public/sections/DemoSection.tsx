"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HeartPulse, Loader2, QrCode, ScanLine, ShieldCheck } from "lucide-react";

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldLoadQr, setShouldLoadQr] = useState(false);
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
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadQr(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadQr) return;

    let generatedUrl: string | null = null;
    let cancelled = false;
    const demoUrl = `${window.location.origin}/e/DEMO-ADMIN-VIP`;

    fetch(`/api/public/qr?data=${encodeURIComponent(demoUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.blob();
      })
      .then((blob) => {
        generatedUrl = URL.createObjectURL(blob);
        if (!cancelled) setQrUrl(generatedUrl);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    };
  }, [shouldLoadQr]);

  const ambientMotion = !reduceMotion && !isMobile;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 60% at 72% 42%, rgba(37,99,235,.15), transparent 62%), radial-gradient(42% 48% at 25% 70%, rgba(218,26,33,.08), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-white/[0.025] shadow-[0_50px_130px_-70px_rgba(37,99,235,.65)] backdrop-blur-xl sm:rounded-[2.2rem]">
          <div className="grid items-center gap-8 p-5 sm:gap-10 sm:p-9 lg:grid-cols-[.88fr_1.12fr] lg:gap-12 lg:p-12 xl:p-16">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-sky-200 sm:mb-6 sm:text-[10px] sm:tracking-[0.18em]">
                <ScanLine className="h-3.5 w-3.5" />
                Demo en vivo
              </div>
              <h2 className="max-w-[11ch] text-[clamp(2.4rem,10vw,3.15rem)] font-black leading-[0.93] tracking-[-0.045em] text-slate-50 sm:max-w-[10ch] sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
                No tienes que imaginarlo. Pruébalo.
              </h2>
              <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
                Escanea el QR y abre un perfil ficticio de emergencia para ver cómo se presenta la información pública desde un teléfono.
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500 sm:mt-4">
                La demostración no contiene información médica real.
              </p>
              <Link
                href="/demo"
                className="group mt-7 flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.05] px-5 text-sm font-bold text-slate-100 transition-all active:bg-white/[0.09] sm:mt-8 sm:inline-flex sm:min-h-12 sm:w-auto sm:hover:border-sky-300/25 sm:hover:bg-white/[0.085]"
              >
                Abrir demo completa
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="relative min-h-[420px] sm:min-h-[520px]"
            >
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-[70px] sm:h-[68%] sm:w-[68%] sm:bg-blue-500/20 sm:blur-[90px]" />

              <motion.div
                animate={ambientMotion ? { y: [0, -8, 0], rotate: [-2, -1, -2] } : undefined}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[2%] top-[16%] z-20 w-[48%] rounded-[1.4rem] border border-white/[0.09] bg-[#f8fafc] p-3 shadow-[0_30px_70px_-28px_rgba(0,0,0,.9)] sm:left-[8%] sm:top-[18%] sm:w-[42%] sm:rounded-[1.8rem] sm:p-5 sm:shadow-[0_35px_80px_-30px_rgba(0,0,0,.9)]"
              >
                <div className="mb-2 flex items-center justify-between sm:mb-3">
                  <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[9px] sm:tracking-[0.16em]">Escanea aquí</span>
                  <QrCode className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                </div>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-3">
                  {loading ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-300 sm:h-8 sm:w-8" /></div>
                  ) : qrUrl ? (
                    <Image src={qrUrl} alt="Código QR de demostración de PreRescue ID" width={360} height={360} unoptimized className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <QrCode className="h-12 w-12 text-slate-300 sm:h-16 sm:w-16" />
                      <p className="mt-2 text-[10px] font-bold text-slate-400 sm:mt-3 sm:text-xs">QR no disponible</p>
                    </div>
                  )}
                  {ambientMotion && (
                    <motion.div
                      aria-hidden="true"
                      animate={{ y: ["-10%", "430%"] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
                      className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_16px_rgba(14,165,233,.9)]"
                    />
                  )}
                </div>
                <p className="mt-2 text-center text-[8px] font-bold text-slate-400 sm:mt-3 sm:text-[9px]">Perfil ficticio · Demo segura</p>
              </motion.div>

              <motion.div
                animate={ambientMotion ? { y: [0, 8, 0], rotate: [2, 1, 2] } : undefined}
                transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-[2%] right-[1%] z-30 w-[59%] overflow-hidden rounded-[1.7rem] border border-white/[0.11] bg-[#070b12] p-1.5 shadow-[0_36px_80px_-32px_rgba(0,0,0,.95)] sm:bottom-[3%] sm:right-[7%] sm:w-[52%] sm:rounded-[2.3rem] sm:p-2 sm:shadow-[0_42px_90px_-35px_rgba(0,0,0,.95)]"
              >
                <div className="rounded-[1.35rem] border border-white/[0.06] bg-gradient-to-b from-[#101b2d] to-[#070a10] p-3 sm:rounded-[1.85rem] sm:p-5">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10 sm:mb-5 sm:h-1.5 sm:w-14" />
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DA1A21]/15 ring-1 ring-[#DA1A21]/20 sm:h-10 sm:w-10 sm:rounded-2xl">
                        <HeartPulse className="h-4 w-4 text-rose-300 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[8px] sm:tracking-[0.16em]">PreRescue ID</p>
                        <p className="mt-0.5 text-[11px] font-extrabold text-white sm:mt-1 sm:text-sm">Perfil de emergencia</p>
                      </div>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                  </div>

                  <div className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2">
                    {["Tipo de sangre", "Alergias", "Condiciones", "Contacto de emergencia"].map((label, index) => (
                      <div key={label} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.055] bg-white/[0.03] px-2.5 py-2 sm:rounded-xl sm:px-3 sm:py-3">
                        <span className="truncate text-[8px] font-semibold text-slate-400 sm:text-[10px]">{label}</span>
                        <span className={`shrink-0 text-[8px] font-bold sm:text-[9px] ${index === 3 ? "text-emerald-300" : "text-slate-200"}`}>{index === 0 ? "O+" : index === 3 ? "Disponible" : "Visible"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
