"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HeartPulse, Loader2, QrCode, ScanLine, ShieldCheck } from "lucide-react";

export default function DemoSection() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
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
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#03060c] py-24 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 60% at 72% 42%, rgba(37,99,235,.15), transparent 62%), radial-gradient(42% 48% at 25% 70%, rgba(218,26,33,.08), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.2rem] border border-white/[0.08] bg-white/[0.025] shadow-[0_50px_130px_-70px_rgba(37,99,235,.65)] backdrop-blur-xl">
          <div className="grid items-center gap-10 p-6 sm:p-9 lg:grid-cols-[.88fr_1.12fr] lg:gap-12 lg:p-12 xl:p-16">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-90px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-200">
                <ScanLine className="h-3.5 w-3.5" />
                Demo en vivo
              </div>
              <h2 className="max-w-[10ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
                No tienes que imaginarlo. Pruébalo.
              </h2>
              <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Escanea el QR y abre un perfil ficticio de emergencia para ver cómo se presenta la información pública desde un teléfono.
              </p>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                La demostración no contiene información médica real.
              </p>
              <Link
                href="/demo"
                className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.05] px-5 text-sm font-bold text-slate-100 transition-all hover:border-sky-300/25 hover:bg-white/[0.085]"
              >
                Abrir demo completa
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-90px" }}
              transition={{ duration: 0.72, delay: 0.08 }}
              className="relative min-h-[520px]"
            >
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[90px]" />

              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [-2, -1, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[3%] top-[18%] z-20 w-[47%] rounded-[1.8rem] border border-white/[0.09] bg-[#f8fafc] p-4 shadow-[0_35px_80px_-30px_rgba(0,0,0,.9)] sm:left-[8%] sm:w-[42%] sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Escanea aquí</span>
                  <QrCode className="h-4 w-4 text-slate-500" />
                </div>
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                  {loading ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
                  ) : qrUrl ? (
                    <Image src={qrUrl} alt="Código QR de demostración de PreRescue ID" width={360} height={360} unoptimized className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <QrCode className="h-16 w-16 text-slate-300" />
                      <p className="mt-3 text-xs font-bold text-slate-400">QR no disponible</p>
                    </div>
                  )}
                  {!reduceMotion && (
                    <motion.div
                      aria-hidden="true"
                      animate={{ y: ["-10%", "430%"] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
                      className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_16px_rgba(14,165,233,.9)]"
                    />
                  )}
                </div>
                <p className="mt-3 text-center text-[9px] font-bold text-slate-400">Perfil ficticio · Demo segura</p>
              </motion.div>

              <motion.div
                animate={reduceMotion ? undefined : { y: [0, 8, 0], rotate: [2, 1, 2] }}
                transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-[3%] right-[2%] z-30 w-[57%] overflow-hidden rounded-[2.3rem] border border-white/[0.11] bg-[#070b12] p-2 shadow-[0_42px_90px_-35px_rgba(0,0,0,.95)] sm:right-[7%] sm:w-[52%]"
              >
                <div className="rounded-[1.85rem] border border-white/[0.06] bg-gradient-to-b from-[#101b2d] to-[#070a10] p-4 sm:p-5">
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

                  <div className="mt-5 space-y-2">
                    {["Tipo de sangre", "Alergias", "Condiciones", "Contacto de emergencia"].map((label, index) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-white/[0.055] bg-white/[0.03] px-3 py-3">
                        <span className="text-[10px] font-semibold text-slate-400">{label}</span>
                        <span className={`text-[9px] font-bold ${index === 3 ? "text-emerald-300" : "text-slate-200"}`}>{index === 0 ? "O+" : index === 3 ? "Disponible" : "Visible"}</span>
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
