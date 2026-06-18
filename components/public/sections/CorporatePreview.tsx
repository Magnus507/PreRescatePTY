"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default function CorporatePreview() {
  return (
    <section className="relative py-16 md:py-24 bg-[#05070D] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Building2 className="h-6 w-6 text-[#10B981]" />
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] text-[#EFF4FF] mb-6">
              Identificación médica para equipos e instituciones
            </h2>
            <p className="text-lg text-[#A0AEC0] font-medium leading-relaxed mb-8">
              Las cuentas corporativas permiten gestionar miembros, perfiles y asignación de chips desde un panel administrativo.
            </p>
              <Link
                href="/empresas"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-[#EFF4FF] font-bold hover:bg-white/20 transition-all border border-white/10"
              >
                Ver página corporativa
              </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card-w2a rounded-3xl p-8 md:p-10"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-[#6B7280] mb-4">Beneficios</p>
            <ul className="space-y-4">
              {["Panel administrativo para gestionar miembros", "Asignación de chips por colaborador", "Perfiles médicos individuales", "Ideal para empresas, escuelas e instituciones"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#EFF4FF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}