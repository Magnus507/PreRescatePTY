'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, MapPin, Scale } from 'lucide-react';

export const TrustSection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <span className="text-brand font-black tracking-widest uppercase text-xs mb-4 block">Seguridad y Confianza</span>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-[1.1]">
                Más que tecnología, somos <span className="text-brand">Panameños</span> cuidando panameños.
              </h2>
            </div>
            
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              En PreRescue ID PTY entendemos que tu privacidad es tan importante como tu vida. Por eso hemos construido el sistema más robusto de identificación en Centroamérica.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                <div className="p-3 rounded-xl bg-brand/10 text-brand">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm mb-1 uppercase tracking-tight text-foreground">Ley 81 / ANTAI</h4>
                  <p className="text-xs text-muted-foreground font-medium">Cumplimiento total con la Protección de Datos Personales en Panamá.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm mb-1 uppercase tracking-tight text-foreground">Sede en Panamá</h4>
                  <p className="text-xs text-muted-foreground font-medium">Soporte local y envíos inmediatos a todo el territorio nacional.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Trust visual */}
            <div className="glass-card p-12 rounded-[3rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] -z-10" />
               <div className="text-center">
                 <ShieldCheck className="w-20 h-20 text-brand mx-auto mb-8 animate-pulse-subtle" />
                 <h3 className="text-2xl font-black text-foreground mb-4">Tu Seguridad es Nuestra Misión</h3>
                  <p className="text-slate-400 font-medium mb-8">
                    &quot;PreRescue ID nace de la necesidad de cerrar la brecha entre un accidente y la llegada de ayuda profesional. Queremos que nadie sea un &apos;desconocido&apos; en una sala de urgencias.&quot;
                  </p>
                 <div className="flex items-center justify-center gap-3">
                   <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-brand flex items-center justify-center text-white font-black">
                     GC
                   </div>
                   <div className="text-left">
                     <p className="font-black text-sm text-foreground">Gean Cusatti</p>
                     <p className="text-xs text-brand font-bold uppercase tracking-widest">Fundador / CEO</p>
                   </div>
                 </div>
               </div>
            </div>
            
            {/* Floating decoration */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          </motion.div>

        </div>
      </div>
    </section>
  );
};
