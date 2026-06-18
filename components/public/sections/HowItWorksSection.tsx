"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShoppingCart, Smartphone, FileText, Scan } from "lucide-react";

const steps = [
  { num: "01", icon: ShoppingCart, title: "Adquiere tu identificación", desc: "Recibe tu sticker con chip NFC y código QR." },
  { num: "02", icon: Smartphone, title: "Activa tu chip", desc: "Ingresa el código de activación y vincúlalo a tu cuenta." },
  { num: "03", icon: FileText, title: "Configura tu perfil", desc: "Completa tu información médica y decide qué campos serán visibles." },
  { num: "04", icon: Scan, title: "Escanea y consulta", desc: "Quien escanee podrá ver la información autorizada y contactar manualmente a tus familiares." },
];

export default function HowItWorksSection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
            Cómo funciona
          </h2>
          <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
            Cuatro pasos simples para tener tu identificación médica de emergencia lista.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-5xl font-black text-slate-200 mb-4">{step.num}</div>
              <div className="h-12 w-12 rounded-xl bg-[#DA1A21]/10 flex items-center justify-center mb-4">
                <step.icon className="h-6 w-6 text-[#DA1A21]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
          >
            Ver cómo funciona
          </Link>
        </motion.div>
      </div>
    </section>
  );
}