"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Users, Baby, Heart, Shield, Brain, Stethoscope, Bike, Building2 } from "lucide-react";

const audiences = [
  { icon: Users, label: "Familias", desc: "Perfiles individuales para cada miembro" },
  { icon: Baby, label: "Niños", desc: "Información médica y contactos de padres" },
  { icon: Heart, label: "Adultos mayores", desc: "Instrucciones de retorno seguro" },
  { icon: Brain, label: "Alzheimer / desorientación", desc: "Ayuda para el regreso a casa" },
  { icon: Shield, label: "Autismo / no verbal", desc: "Instrucciones de comunicación" },
  { icon: Stethoscope, label: "Alergias y condiciones", desc: "Datos médicos críticos visibles" },
  { icon: Bike, label: "Motociclistas", desc: "Sticker en casco o vehículo" },
  { icon: Building2, label: "Empresas", desc: "Panel administrativo corporativo" },
];

export default function WhoIsForSection() {
  return (
    <section className="relative py-16 md:py-24 bg-[#05070D] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-4">
            Diseñado para distintas personas y situaciones
          </h2>
          <p className="text-lg text-[#A0AEC0] font-medium max-w-2xl mx-auto mb-8">
            Un solo sistema, múltiples formas de proteger lo que importa.
          </p>
          <Link
            href="/para-quien-es"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-[#EFF4FF] font-bold hover:bg-white/20 transition-all border border-white/10"
          >
            Ver todos los casos de uso
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {audiences.map((aud, i) => (
            <motion.div
              key={aud.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass-card-w2a rounded-2xl p-5 hover:border-white/20 transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:border-[#10B981]/30 transition-colors">
                <aud.icon className="h-5 w-5 text-[#10B981]" />
              </div>
              <h3 className="text-sm font-bold text-[#EFF4FF] mb-1">{aud.label}</h3>
              <p className="text-xs text-[#A0AEC0] leading-relaxed">{aud.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}