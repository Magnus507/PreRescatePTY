"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MapPin, Phone, Clock, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function ContactoPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

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
      <main className="flex-grow pt-24 pb-16">
        {/* HERO SECTION */}
        <div className="relative py-20 bg-[#0a1128] text-white overflow-hidden rounded-b-[4rem] px-4 sm:px-6 lg:px-8 mb-16 mx-4 shadow-2xl text-center">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 filter brightness-100 contrast-150 mix-blend-overlay"></div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-[#DA1A21] rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>
           <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>
           
           <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
             <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-6">
                <span className="text-[#DA1A21]">Soporte y Negocios</span>
             </div>
             <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-4">Central de Enlace</h1>
             <p className="text-lg sm:text-xl text-slate-300 font-medium">Conectando la seguridad de las vías panameñas con nuestro equipo corporativo. Estamos listos para atenderte.</p>
           </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Info */}
            <div className="space-y-10">
              <div>
                 <h2 className="text-3xl font-black tracking-tighter mb-4">Datos Estructurales</h2>
                 <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                   Tanto si buscas implementarlo masivamente para escuelas, empresas logísticas o necesitas cobertura técnica de tus dispositivos de familia, este es el lugar correcto.
                 </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: Mail, label: "Correo de Soporte Operativo", value: "soporte@prerescatepty.com", bg: "bg-blue-500/10 text-blue-500" },
                  { icon: Phone, label: "Líneas de Atención Directas", value: "+507 6000-0000", bg: "bg-emerald-500/10 text-emerald-500" },
                  { icon: MapPin, label: "Base de Operaciones", value: "Panamá", bg: "bg-[#DA1A21]/10 text-[#DA1A21]" },
                  { icon: Clock, label: "Horario de Resolución", value: "Lunes a Viernes, 9:00 AM - 6:00 PM", bg: "bg-amber-500/10 text-amber-500" },
                ].map((item) => (
                  <div key={item.label} className="group flex items-center gap-5 p-4 rounded-3xl hover:bg-muted/50 transition-colors">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-lg font-bold text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-card border border-border rounded-[3rem] p-10 shadow-2xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#DA1A21]/5 blur-3xl rounded-full" />
              <div className="mb-8 relative z-10">
                 <h2 className="text-2xl font-black flex items-center gap-2"><Send className="h-5 w-5 text-[#DA1A21] -mt-1" /> Mensaje Directo</h2>
                 <p className="text-sm font-medium text-muted-foreground mt-2">Diligencia la forma y un agente de seguridad te contactará en breve.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10 w-full flex flex-col">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Identidad</label>
                  <input required value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} id="contact-name" type="text" className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm input-premium" placeholder="Sr. Admin / Representante Empresarial" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Punto de Contacto (Email)</label>
                  <input required value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} id="contact-email" type="email" className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm input-premium" placeholder="negocio@empresa.com" />
                </div>
                <div className="space-y-2 flex-grow">
                  <label htmlFor="contact-msg" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Razón de la solicitud</label>
                  <textarea required value={formData.message} onChange={e => setFormData(f => ({...f, message: e.target.value}))} id="contact-msg" rows={5} className="w-full rounded-2xl border border-input bg-background/50 px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm resize-none input-premium" placeholder="Explícanos tu requerimiento en detalle..." />
                </div>
                <button disabled={loading} type="submit" className="w-full rounded-2xl bg-gradient-to-r from-brand to-red-700 text-white py-4 font-black hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 flex items-center justify-center mt-4 shadow-button hover:shadow-button-hover active:scale-[0.98]">
                  {loading ? "Despachando Ticket..." : "Enviar a Central"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
