"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Shield, ArrowRight, AlertTriangle } from "lucide-react";
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
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto border border-red-500/30">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-black text-white">Enlace Inválido</p>
          <p className="text-sm text-slate-400">El enlace para cambiar tu contraseña expiró o no es válido.</p>
        </div>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3 text-sm font-black text-white border border-white/10 hover:bg-white/10 transition-all">Solicitar nuevo enlace</Link>
      </div>
    );
  }

  return done ? (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <p className="text-2xl font-black text-white mb-2">Contraseña Actualizada</p>
          <p className="text-sm text-slate-400">Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.</p>
        </div>
      </div>
      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-red-700 px-6 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all gap-2"
      >
        Ir a Iniciar Sesión <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="pass" className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Nueva Contraseña</label>
        <input
          id="pass"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/90 px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="cpass" className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Confirmar Contraseña</label>
        <input
          id="cpass"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/90 px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
          placeholder="Debe coincidir con la anterior"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword}
        className="w-full rounded-2xl bg-gradient-to-r from-brand to-red-700 px-6 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? "Guardando..." : "Guardar Contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.1),_transparent_24%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[3rem] border border-white/10 bg-white/5 shadow-2xl shadow-blue-500/10 backdrop-blur-xl overflow-hidden flex flex-col md:flex-row">
          
          <div className="hidden md:flex md:w-[45%] bg-slate-950/80 p-12 text-white flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.04)_0%,_transparent_70%)] mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-yellow-600/10"></div>
            
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-brand/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-brand mb-8">Cambio seguro</div>
              <h1 className="text-4xl font-black tracking-tight leading-tight mb-6">
                Recupera el <br />
                <span className="text-blue-400">acceso</span> <br />
                a tu cuenta.
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-xs">
                Establezcamos una contraseña nueva y segura para proteger tus datos médicos.
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm">Cambio cifrado y seguro</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm">Valida con Ley 81 de Panamá</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm">Acceso inmediato tras confirmación</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 md:p-16 flex flex-col justify-center bg-slate-950/60">
            <div className="max-w-md mx-auto w-full">
              <div className="md:hidden inline-flex rounded-full bg-brand/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-brand mb-8">Cambio seguro</div>
              
              <h2 className="text-3xl font-black tracking-tight mb-2">Nueva contraseña</h2>
              <p className="text-slate-400 leading-relaxed mb-10">Crea una contraseña fuerte para proteger tu perfil médico. Mínimo 8 caracteres.</p>

              <Suspense fallback={<p className="text-center text-sm text-slate-300">Cargando...</p>}>
                <ResetPasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
