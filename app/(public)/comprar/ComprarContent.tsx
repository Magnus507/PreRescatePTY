"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Zap, ShieldAlert, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import PricingSection from "@/components/home/PricingSection";

export default function ComprarContent() {
  return (
    <div className="bg-background selection:bg-[#DA1A21]/30 selection:text-[#DA1A21] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 bg-[#050814] text-white overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#050814] to-[#050814]" />
           <div className="absolute inset-0 noise-bg opacity-20 mix-blend-overlay" />
           <div className="absolute -top-48 -left-48 w-96 h-96 bg-brand rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />
           
           <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl"
             >
                <span className="text-brand">Precios Claros. Pago Único.</span>
             </motion.div>
             <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-5xl sm:text-7xl font-black tracking-tighter mb-8 leading-[0.95]"
             >
               Catálogo de <span className="text-brand">Rescate</span>
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl mx-auto"
             >
               Invierte de forma permanente en un ecosistema que blinda a toda tu red con 2 años de vigencia total.
             </motion.p>
           </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="grid gap-6 xl:grid-cols-3 mb-16">
            {[
              {
                title: "Activación instantánea",
                desc: "Desbloquea el perfil de cada usuario con un solo toque. La respuesta es inmediata y segura.",
                icon: ShieldAlert,
                accent: "from-blue-500 to-cyan-500"
              },
              {
                title: "Cobertura total",
                desc: "Un mismo kit protege tu casco, tu motocicleta y a tu grupo familiar con registro centralizado.",
                icon: Zap,
                accent: "from-emerald-500 to-teal-400"
              },
              {
                title: "Soporte corporativo",
                desc: "Esquemas de compra institucional con precios especiales y atención prioritaria en Panamá.",
                icon: Check,
                accent: "from-brand to-red-700"
              },
            ].map((card) => (
              <div key={card.title} className="glass-card glass-card-hover border border-white/10 p-8 rounded-[2.5rem] shadow-premium transition-all duration-300">
                <div className={`mb-6 inline-flex rounded-3xl bg-gradient-to-br ${card.accent} px-4 py-3 text-white shadow-glow`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black mb-3">{card.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <PricingSection />
          
          <div className="mt-20 max-w-4xl mx-auto rounded-[3rem] bg-[#0C2444]/95 text-white p-12 text-center relative overflow-hidden glass-card border border-white/10 shadow-premium">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] filter mix-blend-overlay"></div>
               <ShieldAlert className="h-16 w-16 mx-auto mb-6 text-[#DA1A21] relative z-10" />
               <h3 className="text-3xl font-black tracking-tight mb-4 relative z-10">Descuentos Gubernamentales y Colegiales</h3>
               <p className="text-slate-300 font-medium mb-8 relative z-10">Si perteneces a una institución del Estado, bomberos, SINAPROC o requieres licenciar a gran escala a tu alumnado en un colegio, disponemos de subsidios y esquemas API específicos.</p>
               <Link href="/contacto" className="btn-premium inline-block relative z-10 px-10 py-4 text-sm font-black text-white rounded-full bg-gradient-to-r from-brand to-red-700 hover:scale-105 transition-all focus:ring-4 focus:ring-white/30">Agendar Llamada Institucional</Link>
            </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
