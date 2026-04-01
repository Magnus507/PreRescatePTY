"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        phone: form.phone,
        password: form.password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al crear cuenta");
      setLoading(false);
      return;
    }

    // Auto sign in
    const signInRes = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (signInRes?.ok) {
      router.push("/dashboard/perfil");
      router.refresh();
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Crear Cuenta</h1>
            <p className="text-sm text-muted-foreground mt-1">Únete a PreRescate PTY y protege tu vida</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-8 rounded-2xl border border-border bg-card shadow-sm">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5">Email *</label>
              <input id="reg-email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="tu@email.com" />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium mb-1.5">Teléfono (opcional)</label>
              <input id="reg-phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+507 6000-0000" />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5">Contraseña *</label>
              <div className="relative">
                <input id="reg-password" type={showPw ? "text" : "password"} required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1.5">Confirmar Contraseña *</label>
              <input id="reg-confirm" type="password" required value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Repite tu contraseña" />
              {form.confirm && form.password === form.confirm && (
                <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Contraseñas coinciden</p>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 rounded border-input" />
              <span className="text-xs text-muted-foreground">
                Acepto los <Link href="/legal/terminos" target="_blank" className="text-primary hover:underline">Términos y Condiciones</Link> y la <Link href="/legal/privacidad" target="_blank" className="text-primary hover:underline">Política de Privacidad</Link>. Doy mi consentimiento expreso para el tratamiento de mis datos de salud conforme a la Ley 81 de Panamá.
              </span>
            </label>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Iniciar sesión</Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
