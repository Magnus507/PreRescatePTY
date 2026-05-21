"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Shield, ArrowRight } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setDone(true);
        toast.success(data.message);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast.error(data.error || "Ocurrió un error");
      }
    } catch (e: any) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-destructive">Enlace inválido o incompleto.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-white transition-colors">Volver a intentar</Link>
      </div>
    );
  }

  return done ? (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-4 text-success shadow-glow">
        <Shield className="w-6 h-6" />
      </div>
      <p className="text-sm text-slate-200">Tu contraseña ha sido restablecida con éxito.</p>
      <Link
        href="/login"
        className="btn-premium inline-flex w-full items-center justify-center rounded-[1.75rem] bg-gradient-to-r from-brand to-red-700 px-5 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all gap-2"
      >
        Ir a Iniciar Sesión <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="pass" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Nueva Contraseña</label>
        <input
          id="pass"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-premium w-full rounded-[1.5rem] border border-input bg-background/60 px-5 py-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Min 8 caracteres"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="cpass" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Confirmar Contraseña</label>
        <input
          id="cpass"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-premium w-full rounded-[1.5rem] border border-input bg-background/60 px-5 py-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Min 8 caracteres"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword}
        className="btn-premium w-full rounded-[1.75rem] bg-gradient-to-r from-brand to-red-700 px-5 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? "Restableciendo..." : "Guardar Contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.1),_transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md glass-premium border border-white/10 shadow-premium backdrop-blur-3xl p-8 rounded-[2.5rem] overflow-hidden">
          <div className="absolute -top-10 left-6 w-36 h-36 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/80 mb-6">
              Cambio seguro
            </div>
            <h2 className="text-3xl font-black tracking-tight">Crear nueva contraseña</h2>
            <p className="mt-3 text-sm text-slate-300">
              Establece una contraseña segura para proteger tu cuenta y datos médicos.
            </p>
          </div>

          <Suspense fallback={<p className="text-center text-sm text-slate-300">Cargando...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
