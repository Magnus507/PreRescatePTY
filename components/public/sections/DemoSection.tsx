"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { QrCode, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function DemoSection() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const demoUrl = `${window.location.origin}/e/DEMO-ADMIN-VIP`;
    fetch(`/api/public/qr?data=${encodeURIComponent(demoUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.blob();
      })
      .then((blob) => {
        setQrUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section className="relative py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-6">
              Pruébalo tú mismo
            </h2>
            <p className="text-lg text-[#6B7280] font-medium leading-relaxed mb-6">
              Escanea el código QR de demostración y conoce la información que puede mostrarse en un perfil de emergencia.
            </p>
            <p className="text-sm text-[#6B7280] mb-8">
              Perfil ficticio de demostración. No contiene información médica real.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
            >
              <QrCode className="h-5 w-5" />
              Ver Demo
            </Link>
          </motion.div>

          {/* Right: QR */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-white rounded-3xl border border-slate-200 shadow-lg flex items-center justify-center p-8">
              {loading ? (
                <Loader2 className="h-12 w-12 animate-spin text-slate-300" />
              ) : qrUrl ? (
                <Image src={qrUrl} alt="Código QR de demostración" width={320} height={320} unoptimized className="w-full h-full object-contain" />
              ) : (
                <div className="text-center">
                  <QrCode className="h-24 w-24 text-slate-300 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">QR no disponible</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
