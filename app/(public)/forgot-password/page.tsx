"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Shield, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Ocurrió un error");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(218,26,33,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.03)_0%,_transparent_70%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg glass-premium border border-white/10 shadow-premium backdrop-blur-3xl p-8 rounded-[2.5rem] overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#DA1A21]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 text-center mb-10">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 text-primary shadow-glow">
              <Shield className="w-7 h-7" />
            </div>
            <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/80">
              Recuperación segura
            </div>
            <h2 className="text-3xl font-black tracking-tight">Recupera tu cuenta</h2>
            <p className="mt-3 text-sm text-slate-300 max-w-[24rem] mx-auto">
              Ingresa tu email y te enviaremos un enlace seguro para restablecer tu contraseña.
            </p>
          </div>

          {sent ? (
            <div className="relative z-10 space-y-7 text-center">
              <p className="text-sm text-slate-200">
                Hemos enviado las instrucciones a <strong>{email}</strong>. Si no lo ves en tu bandeja principal, revisa spam o promociones.
              </p>
              <Link
                href="/login"
                className="btn-premium inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-red-700 px-5 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium w-full rounded-[1.5rem] border border-input bg-background/60 px-5 py-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-premium w-full rounded-[1.75rem] bg-gradient-to-r from-brand to-red-700 px-5 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>

              <div className="text-center mt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
