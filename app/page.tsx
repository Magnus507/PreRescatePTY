'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StickerDesign } from "@/components/home/StickerDesign";
import { BentoBenefits } from "@/components/home/BentoBenefits";
import { VisualHowItWorks } from "@/components/home/VisualHowItWorks";
import { TrustSection } from "@/components/home/TrustSection";
import PricingSection from "@/components/home/PricingSection";
import {
  ChevronRight, ArrowUpRight, Shield, HeartPulse, 
  Activity, Bell, CheckCircle, Smartphone, QrCode, Scan
} from "lucide-react";

export default function Home() {
  return (
    <div className="bg-background selection:bg-brand/30 selection:text-brand">
      <Navbar />
      <main>
        
        {/* ===== PREMIUM HERO: EMOTIONAL & IMPACTFUL ===== */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-[#050814] text-white">
          {/* Kinetic Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 inset-x-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#050814] to-[#050814]" />
            <div className="absolute inset-0 noise-bg opacity-30 mix-blend-overlay" />
            
            {/* Animated Blobs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand/30 rounded-full blur-[120px] animate-blob" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-32 z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              
              {/* Left Content */}
              <div className="lg:col-span-7 text-left">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                  </span>
                  <span className="text-slate-300">Rescate Inteligente en Panamá</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.95] mb-8 text-balance"
                >
                  Información que <span className="text-brand">habla por ti</span> <br />
                  <span className="text-slate-400">cuando tú no puedes.</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-lg sm:text-xl text-slate-400 font-medium leading-relaxed max-w-xl mb-12"
                >
                  En una emergencia, cada segundo es vital. PreRescue ID otorga a paramédicos tu ficha médica instantánea y alerta a tu familia con solo un toque.
                </motion.p>
                
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.6 }}
                   className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                >
                  <Link
                    href="#pricing"
                    className="group relative inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-brand text-white font-black text-xl overflow-hidden transition-all hover:scale-105 hover:shadow-brand"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                    Protegerse Hoy <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xl hover:bg-white/10 transition-all backdrop-blur-sm"
                  >
                    Cómo Funciona
                  </Link>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-16 flex flex-wrap items-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                >
                  <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Sin Mensualidades</div>
                  <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Sin Baterías</div>
                  <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Compatible con NFC/QR</div>
                </motion.div>
              </div>

              {/* Right Content: Sticker Visual */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="lg:col-span-5 relative"
              >
                <div className="relative z-10">
                  <StickerDesign />
                </div>
                
                {/* Floating Notification Mocks */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 -right-4 md:-right-12 z-20 glass-card p-4 rounded-2xl flex items-center gap-4 animate-in fade-in"
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                     <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Escaneo Exitoso</p>
                    <p className="font-bold text-white text-xs">Ficha médica enviada</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-1/4 -left-4 md:-left-12 z-20 bg-brand/90 backdrop-blur-xl p-4 rounded-2xl shadow-brand flex items-center gap-4"
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-white">
                     <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-brand-200 tracking-widest text-white/70">Alerta de Emergencia</p>
                    <p className="font-bold text-white text-xs">Familia notificada vía GPS</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===== PROBLEM SECTION: EMOTIONAL CONNECTION ===== */}
        <section className="py-32 bg-background overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <motion.div 
                 initial={{ opacity: 0, x: -50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 className="relative"
               >
                 <div className="relative rounded-[3rem] overflow-hidden shadow-premium aspect-square">
                    <Image 
                      src="/hero-helmet.png" 
                      alt="Protección Vial Panamá" 
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-10 left-10 text-white">
                      <p className="text-sm font-black uppercase tracking-widest mb-2 text-brand">Vigilancia 24/7</p>
                      <h3 className="text-3xl font-black tracking-tight">Tu seguridad no descansa.</h3>
                    </div>
                 </div>
                 {/* Decorative element */}
                 <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand/10 blur-3xl rounded-full" />
               </motion.div>

               <motion.div 
                 initial={{ opacity: 0, x: 50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 className="space-y-8"
               >
                 <span className="text-brand font-black tracking-widest uppercase text-xs">El Desafío Crítico</span>
                 <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight text-balance">
                    En la calle, el silencio es tu <span className="text-brand">mayor enemigo</span>.
                 </h2>
                 <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                    Si sufres un accidente y quedas inconsciente, los servicios médicos pierden minutos valiosos tratando de identificarte. PreRescue ID elimina esa incertidumbre para siempre.
                 </p>
                 
                 <div className="space-y-6">
                    <div className="flex gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                       <HeartPulse className="h-6 w-6 text-brand shrink-0" />
                       <div>
                         <h4 className="font-black text-foreground">Minutos de Oro</h4>
                         <p className="text-sm text-muted-foreground font-medium">Reducimos el tiempo de identificación médica de 15 minutos a menos de 1 segundo.</p>
                       </div>
                    </div>
                    <div className="flex gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                       <Smartphone className="h-6 w-6 text-brand shrink-0" />
                       <div>
                         <h4 className="font-black text-foreground">Acceso sin Desbloqueo</h4>
                         <p className="text-sm text-muted-foreground font-medium">Los paramédicos pueden ver tu ficha médica vital sin necesidad de desbloquear tu móvil.</p>
                       </div>
                    </div>
                 </div>
               </motion.div>
            </div>
          </div>
        </section>

        {/* ===== BENTO BENEFITS ===== */}
        <BentoBenefits />

        {/* ===== VISUAL HOW IT WORKS ===== */}
        <div id="how-it-works">
          <VisualHowItWorks />
        </div>

        {/* ===== SEGMENT: MULTI-PROFILE & SAFETY ===== */}
        <section className="py-32 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className="order-2 lg:order-1 space-y-8"
               >
                 <span className="text-brand font-black tracking-widest uppercase text-xs">Protección Multi-perfil</span>
                 <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight">
                    Cuidamos a quienes <span className="text-brand">más amas</span>.
                 </h2>
                 <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                    Nuestros stickers no son solo para conductores. Son perfectos para las mochilas de los niños y las pertenencias de adultos mayores, asegurando que siempre haya una forma de contactarte.
                 </p>
                 
                 <ul className="space-y-4">
                    {["Identificación para niños", "Seguridad para adultos mayores", "Perfiles médicos adicionales"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 font-bold text-foreground">
                        <CheckCircle className="h-5 w-5 text-emerald-500" /> {item}
                      </li>
                    ))}
                 </ul>
                 
                 <div className="pt-8">
                    <Link href="#pricing" className="inline-flex items-center gap-2 text-brand font-black text-lg hover:underline">
                       Ver planes multi-perfil <ChevronRight className="h-5 w-5" />
                    </Link>
                 </div>
               </motion.div>

               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
                 className="order-1 lg:order-2 relative"
               >
                 <div className="relative rounded-[3rem] overflow-hidden shadow-premium aspect-[4/3]">
                    <Image 
                      src="/backpack-safety.png" 
                      alt="Seguridad Niños Panamá" 
                      fill
                      className="object-cover"
                    />
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full -z-10" />
               </motion.div>
            </div>
          </div>
        </section>

        {/* ===== TRUST SECTION ===== */}
        <TrustSection />

        {/* ===== IMPACT METRICS ===== */}
        <section className="py-24 bg-[#050814] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <span className="text-brand font-black tracking-[0.35em] uppercase text-xs">Impacto Real</span>
                <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tighter text-white leading-tight">
                  Cifras que muestran por qué confían en PreRescue ID.
                </h2>
              </div>
              <Link href="/demo" className="btn-premium inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-red-700 px-6 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all">
                Ver demo en vivo
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { value: "+12k", label: "Usuarios protegidos", color: "from-blue-600 to-cyan-500" },
                { value: "99.9%", label: "Disponibilidad de lectura", color: "from-emerald-500 to-teal-400" },
                { value: "2 años", label: "Cobertura sin suscripción", color: "from-brand to-red-700" },
                { value: "+1k", label: "Escaneos de emergencia activados", color: "from-violet-500 to-indigo-500" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card border border-white/10 bg-white/5 p-8 rounded-[2.5rem] shadow-premium transition-all hover:-translate-y-2 hover:shadow-premium-hover">
                  <div className={`mb-4 inline-flex rounded-3xl bg-gradient-to-br ${stat.color} px-4 py-3 text-white shadow-glow`}>#</div>
                  <p className="text-4xl font-black tracking-tight text-white mb-3">{stat.value}</p>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MASTERPIECE SHOWCASE: SCAN ME QR ===== */}
        <section className="py-24 bg-[#050814] relative overflow-hidden">
          <div className="absolute inset-0 z-0">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
                <div className="flex-1 text-center lg:text-left">
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                      <Scan className="h-3 w-3" /> DEMO EN VIVO
                   </div>
                   <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white mb-6 uppercase italic leading-none">
                      Pruébalo <br/> <span className="text-red-600">tú mismo</span>
                   </h2>
                   <p className="text-lg text-slate-400 font-medium max-w-xl mb-10 leading-relaxed">
                      Escanea el código con tu celular o haz clic en él para ver cómo luce el perfil médico de un <span className="text-white font-black underline decoration-red-600">Administrador Verificado</span>. Esta es la información vital que verán los paramédicos.
                   </p>
                   <Link 
                      href="/demo"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-xl"
                   >
                      Ver perfil de ejemplo <ArrowUpRight className="h-4 w-4" />
                   </Link>
                </div>

                <div className="relative group cursor-pointer" onClick={() => window.location.href = '/demo'}>
                   {/* Realistic Sticker Effect */}
                   <div className="relative w-72 h-72 md:w-96 md:h-96 bg-white rounded-[3rem] p-8 md:p-12 shadow-[0_0_80px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_100px_rgba(220,38,38,0.3)] transition-all duration-700 transform group-hover:scale-105 group-hover:-rotate-3">
                      <div className="absolute inset-0 border-[10px] md:border-[15px] border-slate-900 rounded-[3rem] flex flex-col items-center justify-between">
                         <div className="w-full bg-slate-900 text-white text-center py-2 md:py-4 rounded-b-xl">
                            <p className="text-[14px] md:text-[20px] font-black tracking-[0.3em] uppercase italic">SCAN ME</p>
                         </div>
                         
                         <div className="flex-1 w-full flex items-center justify-center p-4 md:p-6">
                            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center relative group/qr">
                               <img 
                                 src="/api/public/qr?data=https://www.prerescatepty.com/e/DEMO-ADMIN-VIP?demo=true" 
                                 alt="Demo QR" 
                                 className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition-transform duration-700" 
                               />
                               <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover/qr:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                         </div>

                         <div className="w-full text-center pb-4 md:pb-6">
                            <p className="text-[10px] md:text-[12px] font-black tracking-[0.2em] text-slate-900 uppercase italic">PreRescue ID Protocol v2.5</p>
                         </div>
                      </div>
                      
                      {/* Floating Indicator */}
                      <div className="absolute -top-6 -right-6 bg-red-600 text-white p-4 rounded-2xl shadow-xl animate-bounce">
                         <Scan className="h-6 w-6" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* ===== PRICING SECTION ===== */}
        <section id="pricing" className="py-32 bg-slate-50 dark:bg-[#050814] border-y border-border relative overflow-hidden">
          <div className="absolute inset-0 noise-bg opacity-[0.03] mix-blend-overlay"></div>
          <PricingSection />
        </section>

        {/* ===== FINAL CTA: PREMIUM & URGENT ===== */}
        <section className="py-32 bg-background relative overflow-hidden">
          {/* Deep Navy/Red Gradient Background */}
          <div className="absolute inset-x-8 inset-y-0 rounded-[4rem] bg-[#0C2444] overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand/20 blur-[150px] -translate-y-1/2 translate-x-1/2" />
              <div className="absolute inset-0 noise-bg opacity-20" />
          </div>
          
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10 text-center py-20">
             <motion.div
               initial={{ opacity: 0, scale: 0.8 }}
               whileInView={{ opacity: 1, scale: 1 }}
               className="mb-10"
             >
                <div className="w-24 h-24 bg-brand rounded-3xl mx-auto flex items-center justify-center shadow-brand animate-pulse-subtle">
                   <Shield className="h-12 w-12 text-white" />
                </div>
             </motion.div>
             
             <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white mb-8 text-balance">
                El futuro de la prevención <br className="hidden sm:block" /> ya está en Panamá.
             </h2>
             <p className="text-xl sm:text-2xl text-slate-300 font-medium max-w-3xl mx-auto mb-16 leading-relaxed">
               Únete a los miles de usuarios que hoy viajan protegidos con PreRescue ID. Seguridad inteligente, sin complicaciones.
             </p>
             
             <Link
                href="#pricing"
                className="inline-flex items-center gap-3 px-12 py-6 rounded-3xl bg-brand text-white font-black text-2xl hover:bg-red-600 hover:scale-105 transition-all shadow-brand"
              >
                Inicia tu Protección <ArrowUpRight className="h-7 w-7" />
             </Link>
             
             <p className="mt-12 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                Envíos a todo el territorio nacional
             </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
