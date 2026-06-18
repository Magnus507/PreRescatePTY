"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Eye, Lock, Trash2 } from "lucide-react";

const privacyPoints = [
  { icon: Eye, title: "Visibilidad configurable", desc: "Decides qué información se muestra al escanear tu chip." },
  { icon: Lock, title: "Datos cifrados", desc: "Información sensible protegida con cifrado." },
  { icon: Shield, title: "Datos nunca expuestos", desc: "Tu correo y fecha de nacimiento no se muestran públicamente." },
  { icon: Trash2, title: "Eliminación disponible", desc: "Puedes solicitar la eliminación de tu cuenta en cualquier momento." },
];

export default function PrivacySection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#05070D] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(218,26,33,0.06),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="relative">
              <div className="glass-card-w2a rounded-3xl p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[#DA1A21]/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-[#DA1A21]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Panel de control</p>
                    <p className="text-sm font-bold text-[#EFF4FF]">Tu información. Tus decisiones.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {privacyPoints.map((point) => (
                    <div key={point.title} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <point.icon className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#EFF4FF]">{point.title}</p>
                        <p className="text-xs text-[#A0AEC0]">{point.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-6">
              Tu información. Tus decisiones.
            </h2>
            <p className="text-lg text-[#A0AEC0] font-medium leading-relaxed mb-6">
              Tú controlas qué información se muestra al escanear tu chip. Cumplimos con la Ley 81 de Protección de Datos Personales de Panamá.
            </p>
            <ul className="space-y-3 mb-8">
              {privacyPoints.map((point) => (
                <li key={point.title} className="flex items-center gap-3 text-sm text-[#A0AEC0]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  {point.desc}
                </li>
              ))}
            </ul>
            <Link
              href="/legal/privacidad"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[#EFF4FF] font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Conocer nuestra política de privacidad
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}