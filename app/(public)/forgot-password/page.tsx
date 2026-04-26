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
    } catch (e: any) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
        
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Recuperar Contraseña</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {sent 
              ? "Revisa tu bandeja de entrada" 
              : "Ingresa tu email para recibir un enlace de recuperación"}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <p className="text-sm">
              Hemos enviado instrucciones a <strong>{email}</strong>. Si no lo encuentras, revisa tu carpeta de spam.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Volver a Iniciar Sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full relative flex items-center justify-center py-3 px-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none overflow-hidden"
            >
              {loading ? "Enviando..." : "Enviar Enlace"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
