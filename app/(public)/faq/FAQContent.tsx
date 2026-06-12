"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FAQContent() {
  const faqs = [
    { q: "¿Qué es en esencia PreRescue ID PTY?", a: "Es el sistema definitivo de identificación médica para Panamá. Imprimimos nuestro núcleo en un sticker con chip NFC y código QR. En caso de accidentes automovilísticos, cualquier paramédico al escanearlo verá en tiempo real tu tipo de sangre, alergias, y disparará alertas directas a tu familia." },
    { q: "¿Obligo a las personas a instalar una APP para leerme?", a: "Absolutamente NO. Esa es la magia total del sistema; está basado íntegramente en Web-Clips y estandarización de chips de tap-to-read del sistema operativo abierto. Pasas el celular por el chip, y se abrirá nuestro entorno HTTPS cifrado sin apps externas." },
    { q: "¿Quién tiene acceso a mi registro?", a: "Tus datos completos solo están asegurados por ti en el Dashboard mediante Auth Cifrado. Al mundo público, sólo se le emite la 'ficha médica', la cual solo muestra a quienes escaneen tu sticker físico." },
    { q: "¿Qué sucede si sufro un hackeo y mi sticker cae en manos ajenas?", a: "Para empezar el código es criptográfico por unidad. Pero si alguien te lo robara, puedes entrar a tu Dashboard presionar 'Suspender Ficha', e inmediatamente tu sticker en físico se volverá un plástico inútil sin valor en segundos." },
    { q: "¿Están sujetos a leyes en Panamá?", a: "Nos adherimos al 100% bajo la reglamentación ANTAI y la Ley 81 de Protección de Datos Personales, garantizando la trazabilidad, rectificación y retención ética de logs." },
    { q: "¿Ofrecen cobertura a Colegios?", a: "Sí, disponemos de la versión Colegial mediante la cual entidades educativas pueden expedir chips de la plataforma bajo el manejo directo de su módulo corporativo hacia estudiantes." },
  ];

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
               className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl"
             >
                <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <span className="text-slate-300">Base de Conocimientos</span>
             </motion.div>
             <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-5xl sm:text-7xl font-black tracking-tighter mb-8 leading-[0.95]"
             >
               Resolviendo <span className="text-brand">Dudas</span>
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl mx-auto"
             >
               Transparencia total sobre la tecnología que protege tu vida.
             </motion.p>
           </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-24">

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="group overflow-hidden rounded-[2.5rem] bg-card/90 border border-white/10 glass-card glass-card-hover shadow-premium transition-all duration-300">
                <div className="p-8">
                  <h3 className="text-xl font-black mb-3 flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-3xl bg-brand/10 text-brand flex items-center justify-center text-sm font-black">{i + 1}</span>
                    <span className="leading-tight mt-1">{faq.q}</span>
                  </h3>
                  <p className="text-muted-foreground font-medium text-base leading-relaxed pl-12">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center glass-card shadow-premium">
             <Heart className="h-10 w-10 mx-auto text-[#DA1A21] mb-4" />
             <h4 className="text-2xl font-black tracking-tighter mb-2">¿Aún con dudas?</h4>
             <p className="text-muted-foreground font-medium mb-6">Nuestro equipo corporativo en Panamá está a tu disposición en cualquier momento para guiarte en una compra corporativa o familiar.</p>
             <Link href="/contacto" className="btn-premium inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-brand to-red-700 text-white font-black hover:shadow-button-hover transition-all">
               Hablar con un asesor
             </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
