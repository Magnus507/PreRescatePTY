"use client";

import { motion } from "framer-motion";
import { Shield, QrCode, Lock } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR y NFC integrados",
    description: "Código QR impreso y chip NFC en un solo sticker. Cualquier celular puede leerlo.",
  },
  {
    icon: Lock,
    title: "Tú controlas la información",
    description: "Decides qué datos se muestran al escanear. Alergias, condiciones, contactos y más.",
  },
  {
    icon: Shield,
    title: "Datos protegidos",
    description: "Información sensible cifrada. Tu correo y fecha de nacimiento nunca se exponen.",
  },
];

export default function WhatIsSection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#05070D] overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.06),_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-6"
            >
              ¿Qué es PreRescue ID?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-[#A0AEC0] font-medium leading-relaxed mb-8"
            >
              PreRescue ID es un sistema de identificación médica de emergencia. Un sticker con NFC y código QR que permite consultar la información que tú decidas mostrar: tipo de sangre, alergias, condiciones, medicamentos y contactos de emergencia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap gap-3"
            >
              {["No requiere aplicación", "No necesita batería", "Tú eliges qué mostrar", "Funciona en cualquier país con internet"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-[#EFF4FF]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card-w2a rounded-2xl p-6 hover:border-white/20 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-[#10B981]" />
                </div>
                <h3 className="text-base font-bold text-[#EFF4FF] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#A0AEC0] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}