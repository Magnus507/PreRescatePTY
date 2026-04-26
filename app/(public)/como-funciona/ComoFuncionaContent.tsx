"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Smartphone, QrCode, UserCheck, Bell, Scan, CheckCircle, Activity, Heart, ArrowUpRight } from "lucide-react";

export default function ComoFuncionaContent() {
  return (
    <div className="bg-background selection:bg-[#DA1A21]/30 selection:text-[#DA1A21] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 bg-[#050814] text-white overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#050814] to-[#050814]" />
           <div className="absolute inset-0 noise-bg opacity-20 mix-blend-overlay" />
           <div className="absolute -top-48 -left-48 w-96 h-96 bg-brand rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />
           <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-10" />
           
           <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl"
             >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                <span className="text-slate-300">Metodología de Acción</span>
              </motion.div>
             <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-5xl sm:text-7xl font-black tracking-tighter mb-8 leading-[0.95]"
             >
               Mecánica de <span className="text-brand">Salvamento</span>
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl mx-auto"
             >
               Un sistema simple pero sumamente poderoso. Te explicamos los pasos detrás de la tecnología que puede salvar tu vida en la calle.
             </motion.p>
           </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24">

          {/* Steps */}
          <div className="space-y-16">
            {[
              {
                step: 1, icon: QrCode, title: "1. Adquisición e Instalación",
                desc: "Recibirás tu sticker PreRescue ID físico. Cada chip cuenta con tecnología NFC inyectada invisiblemente y un código QR serializado. Está diseñado para ser adherido a tu casco, tu motocicleta o tu identificación principal.",
                details: ["Chip NFC NTAG213 interno super-rápido", "Vinilo vehicular de alta durabilidad", "Resistencia total a clima severo", "URL criptográfica única"],
                color: "bg-blue-600/10 text-blue-600"
              },
              {
                step: 2, icon: UserCheck, title: "2. Activación Cero-Fricciones",
                desc: "Al recibirlo, solo necesitas tocarlo con tu celular. El chip te llevará al panel seguro donde crearás tu perfil. Completarás tus datos de vital importancia: Alergias, padecimientos, y contactos ICE.",
                details: ["Señalización Segura sin APP", "Ingreso de Tipo Sanguíneo", "Gestión de Contactos Ilimitada", "Consentimiento según Ley 81"],
                color: "bg-emerald-600/10 text-emerald-600"
              },
              {
                step: 3, icon: Scan, title: "3. Guardia Silenciosa",
                desc: "El entorno está listo. Tu chip entra en estado de guardia pasiva. Si sufres un percance vial, cualquier transeúnte o paramédico solo tiene que acercar su celular moderno al sticker y este destellará tu perfil médico público.",
                details: ["Respuesta NFC en 0.4s", "Visual sin barreras de autenticación locales", "Compatible con iPhone/Android", "Lectura QR como respaldo"],
                color: "bg-indigo-600/10 text-indigo-600"
              },
              {
                step: 4, icon: Bell, title: "4. Alertas Masivas Inmediatas",
                desc: "El simple hecho de escanear el tag en el asfalto dispara inmediatamente un protocolo de alerta a todos los teléfonos y correos que configuraste, enviando tu última posición GPS calculada al momento del escaneo.",
                details: ["Push Notifications Internas", "Disparo SMS Externo", "Localización aproximada", "Bitácora en vivo"],
                color: "bg-[#DA1A21]/10 text-[#DA1A21]"
              },
            ].map((item) => (
              <div key={item.step} className="group relative flex flex-col sm:flex-row gap-8 items-start bg-card rounded-[2.5rem] p-8 border border-border shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className={`flex-shrink-0 w-20 h-20 rounded-3xl ${item.color} flex items-center justify-center`}>
                   <item.icon className="h-10 w-10" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black mb-4 tracking-tight">
                    {item.title}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6 font-medium">{item.desc}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {item.details.map((d, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-semibold opacity-90">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Tech badges */}
          <div className="mt-20 p-12 rounded-[3rem] bg-slate-900 border border-slate-800 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-[#DA1A21]/20 opacity-50 blur-3xl mix-blend-soft-light" />
            <h3 className="text-2xl font-black mb-8 relative z-10">Arquitectura y Hardware</h3>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              {["NFC NTAG213", "QR Laserizado", "Criptografía SSL/TLS", "Data Isolation", "Vercel Edge", "Prisma ORM"].map((t) => (
                <span key={t} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold backdrop-blur-md flex items-center gap-2 border border-white/5 shadow-2xl hover:bg-white/20 transition-all cursor-default text-sm">
                  <Activity className="h-4 w-4 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center pb-8">
            <Link href="/comprar" className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-[#DA1A21] text-white font-black text-xl hover:bg-red-700 transition-all shadow-[0_0_40px_-10px_rgba(218,26,33,0.8)] hover:scale-105">
              Solicitar Dispositivo Físico <ArrowUpRight className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
