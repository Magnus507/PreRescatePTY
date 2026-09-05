"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";

export default function ContactoPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/public", {
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
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Soporte y negocios"
          title="Cuéntanos qué"
          titleAccent="necesitas."
          description="Utiliza el formulario para consultas sobre producto, pedidos, soporte o soluciones para organizaciones."
        />

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(46% 54% at 80% 30%, rgba(37,99,235,.11), transparent 64%), radial-gradient(32% 44% at 12% 78%, rgba(218,26,33,.06), transparent 68%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-9 sm:gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-14">
              <div className="lg:sticky lg:top-28">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200 sm:text-[10px] sm:tracking-[0.18em]">
                  <Mail className="h-3.5 w-3.5" /> Canal de contacto
                </div>
                <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.9rem)] sm:leading-[0.91]">
                  Un solo formulario, la consulta correcta.
                </h2>
                <p className="mt-5 max-w-lg text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-base sm:leading-7">
                  Describe tu caso con suficiente contexto para que podamos orientarte de forma más útil desde la primera respuesta.
                </p>

                <div className="mt-6 space-y-2.5 sm:mt-9 sm:space-y-3">
                  {[
                    ["Producto y planes", "Dudas sobre PreRescue ID y las opciones disponibles."],
                    ["Pedidos y soporte", "Consultas relacionadas con una compra o el uso del servicio."],
                    ["Empresas e instituciones", "Información para equipos, organizaciones y compras por volumen."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-[1.1rem] border border-white/[0.065] bg-white/[0.025] p-4 sm:rounded-2xl">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <div>
                          <p className="text-[13px] font-extrabold text-slate-200 sm:text-sm">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_38px_100px_-65px_rgba(37,99,235,.62)] backdrop-blur-xl sm:rounded-[2.2rem] sm:p-8 sm:shadow-[0_45px_120px_-65px_rgba(37,99,235,.7)] sm:backdrop-blur-2xl lg:p-10">
                <div aria-hidden="true" className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/[0.08] blur-[65px] sm:h-52 sm:w-52 sm:bg-blue-500/10 sm:blur-[80px]" />
                <div className="relative">
                  <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/[0.06] pb-5 sm:mb-8 sm:pb-6">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-[9px] sm:tracking-[0.18em]">Mensaje</p>
                      <h2 className="mt-1.5 text-[22px] font-black tracking-[-0.035em] text-slate-50 sm:mt-2 sm:text-3xl">Escríbenos</h2>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/12 bg-sky-300/[0.05] sm:h-11 sm:w-11 sm:rounded-2xl">
                      <Send className="h-[18px] w-[18px] text-sky-300 sm:h-5 sm:w-5" />
                    </span>
                  </div>

                  {sent ? (
                    <div className="rounded-[1.35rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-5 sm:rounded-[1.6rem] sm:p-7">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] sm:h-11 sm:w-11 sm:rounded-2xl">
                          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                        </span>
                        <div>
                          <p className="text-base font-black text-slate-50 sm:text-lg">Mensaje enviado</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">Tu consulta fue recibida. Responderemos tan pronto como sea posible.</p>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:gap-3">
                        <Link href="/" className="inline-flex min-h-[52px] touch-manipulation items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-bold text-slate-200 transition-all active:bg-white/[0.07] sm:min-h-12 sm:hover:bg-white/[0.07]">Volver al inicio</Link>
                        <button onClick={() => setSent(false)} className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-extrabold text-white transition-all active:bg-[#ef2d35] sm:min-h-12 sm:hover:bg-[#ef2d35]">Enviar otro <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                      <div className="space-y-2">
                        <label htmlFor="contact-name" className="ml-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]">Nombre</label>
                        <input required value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} id="contact-name" type="text" autoComplete="name" className="min-h-[52px] w-full rounded-[1rem] border border-white/[0.08] bg-black/20 px-4 py-3 text-base font-medium text-slate-100 outline-none transition-all placeholder:text-slate-700 focus:border-sky-300/30 focus:ring-4 focus:ring-sky-300/[0.05] sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm" placeholder="Tu nombre" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="contact-email" className="ml-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]">Correo electrónico</label>
                        <input required value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} id="contact-email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" className="min-h-[52px] w-full rounded-[1rem] border border-white/[0.08] bg-black/20 px-4 py-3 text-base font-medium text-slate-100 outline-none transition-all placeholder:text-slate-700 focus:border-sky-300/30 focus:ring-4 focus:ring-sky-300/[0.05] sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm" placeholder="correo@ejemplo.com" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="contact-msg" className="ml-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]">Consulta</label>
                        <textarea required value={formData.message} onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))} id="contact-msg" rows={5} className="w-full resize-none rounded-[1rem] border border-white/[0.08] bg-black/20 px-4 py-3 text-base font-medium text-slate-100 outline-none transition-all placeholder:text-slate-700 focus:border-sky-300/30 focus:ring-4 focus:ring-sky-300/[0.05] sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm" placeholder="Explícanos tu consulta con el contexto necesario..." />
                      </div>
                      <button disabled={loading} type="submit" className="group flex min-h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_16px_45px_-20px_rgba(218,26,33,.9)] transition-all active:scale-[0.99] active:bg-[#ef2d35] disabled:pointer-events-none disabled:opacity-50 sm:min-h-14 sm:hover:bg-[#ef2d35]">
                        {loading ? "Enviando..." : "Enviar mensaje"}
                        {!loading && <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                      </button>
                    </form>
                  )}

                  <div className="mt-6 rounded-[1rem] border border-white/[0.055] bg-black/20 p-4 sm:mt-7 sm:rounded-2xl">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-[9px] sm:tracking-[0.16em]">Tiempo de respuesta</p>
                    <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500 sm:mt-2">Responderemos tan pronto como sea posible. Incluye información relevante para reducir intercambios innecesarios.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
