'use client';

import React from 'react';
import { 
  Zap, Smartphone, Globe, 
  Lock, CreditCard, BellRing 
} from 'lucide-react';
import { motion } from 'framer-motion';

const benefits = [
  {
    title: "Acceso Instantáneo",
    description: "Sin apps, sin demoras. Un toque y tu ficha médica aparece en 0.4s.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    className: "md:col-span-2 md:row-span-1 bg-gradient-to-br from-slate-900 to-blue-900 text-white",
  },
  {
    title: "Privacidad Total",
    description: "Aplicamos controles de privacidad tomando como referencia la Ley 81 de Panamá. Tú eliges qué campos opcionales se muestran.",
    icon: <Lock className="w-6 h-6 text-emerald-400" />,
    className: "md:col-span-1 md:row-span-1 bg-slate-900 text-white",
  },
  {
    title: "Sin Mensualidades",
    description: "Un solo pago te protege por 2 años completos.",
    icon: <CreditCard className="w-6 h-6 text-brand" />,
    className: "md:col-span-1 md:row-span-2 bg-slate-100 dark:bg-slate-800 text-foreground",
  },
  {
    title: "Alertas Activas",
    description: "Cada escaneo activa una alerta inmediata con GPS a tus contactos.",
    icon: <BellRing className="w-6 h-6 text-red-500" />,
    className: "md:col-span-2 md:row-span-1 bg-brand text-white",
  },
  {
    title: "Compatible con Todo",
    description: "Funciona en iPhone y Android mediante NFC y QR.",
    icon: <Smartphone className="w-6 h-6 text-blue-400" />,
    className: "md:col-span-1 md:row-span-1 bg-slate-900 text-white",
  },
  {
    title: "Sello Panameño",
    description: "Desarrollado en Panamá para las necesidades de nuestra gente.",
    icon: <Globe className="w-6 h-6 text-indigo-400" />,
    className: "md:col-span-2 md:row-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 text-white",
  }
];

export const BentoBenefits = () => {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground mb-4">
            ¿Por qué elegir <span className="text-brand">PreRescue ID</span>?
          </h2>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Combinamos tecnología de vanguardia con un enfoque humano para salvar vidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[180px]">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`group relative rounded-[2rem] p-8 overflow-hidden flex flex-col justify-end border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500 ${benefit.className}`}
            >
              {/* Decorative elements */}
              <div className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:rotate-12 group-hover:scale-110 group-hover:-translate-y-1">
                {benefit.icon}
              </div>
              
              <div className="relative z-10">
                <div className={`mb-3 p-2 rounded-lg w-fit ${benefit.className.includes('bg-brand') ? 'bg-white/20' : 'bg-brand/10 text-brand'}`}>
                  {benefit.icon}
                </div>
                <h3 className={`text-xl font-black tracking-tight mb-2 ${benefit.className.includes('text-white') ? 'text-white' : 'text-foreground'}`}>
                  {benefit.title}
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${benefit.className.includes('bg-slate-900') || benefit.className.includes('bg-brand') ? 'text-slate-300' : 'text-muted-foreground'}`}>
                  {benefit.description}
                </p>
              </div>
              
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
