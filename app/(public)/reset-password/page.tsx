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
      <div className="text-center space-y-4">
        <p className="text-sm text-destructive">Enlace inválido o incompleto.</p>
        <Link href="/forgot-password" className="text-sm hover:underline text-primary">Volver a intentar</Link>
      </div>
    );
  }

  return done ? (
    <div className="text-center space-y-6">
      <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4 text-success">
        <Shield className="w-6 h-6" />
      </div>
      <p className="text-sm">Tu contraseña ha sido restablecida con éxito.</p>
      <Link 
        href="/login" 
        className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all gap-2"
      >
        Ir a Iniciar Sesión <ArrowRight className="w-4 h-4"/>
      </Link>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="pass" className="text-sm font-medium">Nueva Contraseña</label>
        <input
          id="pass"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          placeholder="Min 8 caracteres"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="cpass" className="text-sm font-medium">Confirmar Contraseña</label>
        <input
          id="cpass"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          placeholder="Min 8 caracteres"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password || !confirmPassword}
        className="w-full relative flex items-center justify-center py-3 px-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none overflow-hidden"
      >
        {loading ? "Restableciendo..." : "Guardar Contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Crear nueva contraseña</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ingresa tu nueva contraseña segura
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-sm">Cargando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
