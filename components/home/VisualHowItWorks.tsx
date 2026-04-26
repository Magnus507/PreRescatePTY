'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Settings, Activity, Bell } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus className="w-8 h-8" />,
    title: "1. Adquiere tu Sticker",
    description: "Recibe tu kit oficial con tecnología NFC + QR blindada.",
    color: "bg-blue-500",
  },
  {
    icon: <Settings className="w-8 h-8" />,
    title: "2. Activa en Segundos",
    description: "Un toque con tu móvil y configura tu ficha médica sin apps.",
    color: "bg-emerald-500",
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: "3. Listo para Ayudar",
    description: "En caso de emergencia, tu ficha habla por ti instantáneamente.",
    color: "bg-brand",
  },
  {
    icon: <Bell className="w-8 h-8" />,
    title: "4. Alerta a tu Familia",
    description: "Tus contactos reciben tu ubicación GPS al ser escaneado.",
    color: "bg-indigo-600",
  }
];

export const VisualHowItWorks = () => {
  return (
    <section className="py-24 bg-slate-50 dark:bg-[#050814] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <span className="text-brand font-black tracking-widest uppercase text-xs mb-4 block">Proceso de Salvamento</span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground">
            Simple. <span className="text-brand">Efectivo.</span> Vital.
          </h2>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center group"
              >
                <div className={`relative w-20 h-20 rounded-[2rem] ${step.color} text-white flex items-center justify-center mb-8 shadow-premium transform group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                  {step.icon}
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border-2 border-white text-white text-xs font-black flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                
                <h3 className="text-xl font-black tracking-tight mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground font-medium text-sm leading-relaxed max-w-[200px]">
                  {step.description}
                </p>
                
                {/* Visual arrow for mobile/tablet */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden mt-8 text-slate-300 animate-bounce">
                    ↓
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="mt-20 text-center">
          <p className="text-sm font-bold text-slate-400 italic">
            * No requiere baterías, chips de celular ni pagos mensuales.
          </p>
        </div>
      </div>
    </section>
  );
};
