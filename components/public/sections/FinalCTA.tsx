"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32 bg-[#DA1A21] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,_white,_transparent_50%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] text-white mb-6"
        >
          Tu información puede ayudarte a comunicar lo importante.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-white/80 font-medium leading-relaxed max-w-2xl mx-auto mb-10"
        >
          Crea tu perfil médico de emergencia y elige qué información estará disponible al escanear tu identificación.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4"
        >
          <Link
            href="/comprar"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
          >
            Conocer los planes
            <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            Ver Demo
          </Link>
        </motion.div>
      </div>
    </section>
  );
}