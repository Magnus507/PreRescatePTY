"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MapPin, Phone, Clock, Send, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function ContactoPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/publics/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Mensaje enviado exitosamente");
        setFormData({ name: "", email: "", message: "" });
        setSent(true);
      } else {
        toast.error(data.error || "Error al enviar mensaje");
      }
    } catch (e: any) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background selection:bg-[#DA1A21]/30 selection:text-[#DA1A21] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* HERO SECTION */}
        <div className="relative pt-28 pb-20 bg-[#0a1128] text-white overflow-hidden rounded-b-[4rem] px-4 sm:px-6 lg:px-8 shadow-2xl">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 filter brightness-100 contrast-150 mix-blend-overlay"></div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-[#DA1A21] rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>
           <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>
           <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a1128] to-transparent" />
           
           <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
             <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-6">
                <span className="text-[#DA1A21]">Soporte y Negocios</span>
             </div>
             <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6">Central de Enlace de PreRescue PTY</h1>
             <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-3xl">Conectamos la seguridad de las vías panameñas con un servicio de soporte empresarial rápido y confiable. Estamos listos para atender tu proyecto.</p>
             <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-white/90 border border-white/10 shadow-glow">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" /> Atención prioritaria en 30 minutos
             </div>
           </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
            <div className="space-y-10">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { icon: Mail, title: "Respuesta inmediata", caption: "Contesta tu consulta con prioridad corporativa.", accent: "from-blue-500 to-cyan-500" },
                  { icon: Phone, title: "Línea directa", caption: "+507 6000-0000 disponible para emergencias.", accent: "from-emerald-500 to-teal-400" },
                  { icon: ShieldAlert, title: "Soporte legal", caption: "Asesoría para compra institucional y protocolos Ley 81.", accent: "from-brand to-red-700" },
                ].map((item) => (
                  <div key={item.title} className="glass-card border border-white/10 bg-white/5 p-8 rounded-[2.5rem] shadow-premium transition-all hover:-translate-y-1">
                    <div className={`mb-6 inline-flex rounded-3xl bg-gradient-to-br ${item.accent} px-4 py-3 text-white shadow-glow`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black mb-3">{item.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">{item.caption}</p>
                  </div>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#0c1630]/95 p-10 shadow-premium">
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(218,26,33,0.18),_transparent_40%)] opacity-50 pointer-events-none" />
                <div className="relative z-10 grid gap-6 sm:grid-cols-2">
                  <div>
                    <span className="text-sm uppercase tracking-[0.35em] text-brand font-black">Soporte Premium</span>
                    <h2 className="mt-4 text-4xl font-black tracking-tight text-white">Atención rápida, confiable y segura</h2>
                    <p className="mt-4 text-slate-300 leading-relaxed">Nuestro equipo responde con prioridad institucional y te acompaña en cada paso de la implementación.</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black">Días hábiles</p>
                      <p className="mt-2 text-xl font-black text-white">Lun - Vie</p>
                    </div>
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black">Garantía</p>
                      <p className="mt-2 text-xl font-black text-white">Respuesta en menos de 30 min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-6 right-6 w-28 h-28 rounded-full bg-[#DA1A21]/10 blur-3xl" />
              <div className="mb-8 relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#DA1A21]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#DA1A21] border border-[#DA1A21]/20">
                   <ShieldAlert className="h-4 w-4" /> Atención Inmediata
                </div>
                <h2 className="mt-6 text-3xl font-black">Escríbenos y te contactamos</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Completa el formulario y un agente se comunicará contigo antes de que termine el día.</p>
              </div>
              {sent ? (
                <div className="relative z-10 p-6 rounded-2xl bg-emerald-900/40 border border-emerald-700/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-600/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-black text-white">Mensaje enviado</p>
                      <p className="text-sm text-slate-300">Nuestro equipo te contactará antes de que termine el día hábil.</p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 transition">Volver al inicio</Link>
                    <button onClick={() => setSent(false)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-red-700 px-5 py-3 text-sm font-black text-white shadow-button hover:shadow-button-hover transition">Enviar otro</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 relative z-10 w-full flex flex-col">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Identidad</label>
                    <input required value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} id="contact-name" type="text" className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm input-premium" placeholder="Sr. Admin / Representante Empresarial" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Punto de Contacto (Email)</label>
                    <input required value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} id="contact-email" type="email" className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm input-premium" placeholder="negocio@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-msg" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Razón de la solicitud</label>
                    <textarea required value={formData.message} onChange={e => setFormData(f => ({...f, message: e.target.value}))} id="contact-msg" rows={5} className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm resize-none input-premium" placeholder="Explícanos tu requerimiento en detalle..." />
                  </div>
                  <button disabled={loading} type="submit" className="w-full rounded-2xl bg-gradient-to-r from-brand to-red-700 text-white py-4 font-black hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center mt-4 shadow-button hover:shadow-button-hover active:scale-[0.98]">
                    {loading ? "Despachando Ticket..." : "Enviar a Central"}
                  </button>
                </form>
              )}

              <div className="mt-8 rounded-[2rem] bg-slate-950/80 border border-white/10 p-6 text-sm text-slate-300">
                <p className="uppercase tracking-[0.2em] text-slate-500 font-black">¿Te apuras?</p>
                <p className="mt-3 font-black text-white">Llámanos ahora: <a href="tel:+5076000000" className="text-brand hover:text-white">+507 6000-0000</a></p>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-[3rem] border border-white/10 bg-white/5 p-10 shadow-premium">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="space-y-2">
                   <p className="text-sm uppercase tracking-[0.3em] text-brand font-black">¿Quieres una atención más rápida?</p>
                   <h3 className="text-3xl font-black text-white">Solicita una llamada inmediata de nuestro equipo especializado.</h3>
               </div>
               <Link href="/demo" className="btn-premium inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-red-700 px-8 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all">
                   Ver Demo Ahora
               </Link>
             </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
