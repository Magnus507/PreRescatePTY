"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Shield, Loader2, ArrowRight,
  Lock, Mail, HeartPulse, CheckCircle2, ShieldAlert,
  User, Phone
} from "lucide-react";
import { CONSENT_TEXT_VERSION } from "@/domains/consents/consent.constants";

type PackageSummary = {
  id: string;
  name: string;
  price: number;
};

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#DA1A21]" /></div>}>
      <RegistroForm />
    </Suspense>
  );
}

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package");

  const [selectedPkg, setSelectedPkg] = useState<PackageSummary | null>(null);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
    confirm: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (packageId) {
      fetch("/api/public/packages")
        .then(res => res.json())
        .then(data => {
          const pkg = data.packages?.find((p: PackageSummary) => p.id === packageId);
          if (pkg) setSelectedPkg(pkg);
        })
        .catch(err => console.error("Error loading package summary:", err));
    }
  }, [packageId]);

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

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          phone: form.phone,
          password: form.password,
          accountType: "personal",
          packageId: packageId,
          acceptedTerms: true,
          consentTextVersion: CONSENT_TEXT_VERSION.TERMS_AND_PRIVACY,
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

      if (signInRes?.ok) {
        router.push(packageId ? "/comprar" : "/dashboard");
        router.refresh();
      } else {
        router.push("/login?email=" + encodeURIComponent(form.email));
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050812] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.12),_transparent_28%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.03)_0%,_transparent_70%)] pointer-events-none" />
      <div className="relative z-10">

      <div className="mx-auto w-full max-w-7xl rounded-[3rem] border border-white/10 bg-white/5 shadow-2xl shadow-blue-500/20 backdrop-blur-xl overflow-hidden flex flex-col md:flex-row min-h-[85vh]">

        {/* Left Side: Branding & Account Types */}
        <div className="hidden md:flex md:w-[40%] bg-slate-950/95 p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.04)_0%,_transparent_70%)] mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-emerald-600/10"></div>

          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 mb-16 group w-fit">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
                <Shield className="h-6 w-6 text-slate-950" />
              </div>
              <span className="text-xl font-black tracking-tighter">PreRescate<span className="text-blue-400">PTY</span></span>
            </Link>

            <h2 className="text-4xl font-black tracking-tight leading-tight mb-8">
              Únete a la <br />
              <span className="text-blue-400">red de protección</span> <br />
              más avanzada.
            </h2>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/30">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">Protección Personal</p>
                      <p className="text-xs text-slate-500 mt-1">Protege a tus seres queridos con identificación médica de emergencia.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

          <div className="relative z-10 pt-8">
            <div className="flex items-center gap-4 group">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <HeartPulse className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-sm">Vital Sinc</p>
                <p className="text-xs text-slate-500">Privacidad y control de datos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Step-by-Step Form */}
        <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-slate-950/95 scrollbar-hide overflow-y-auto max-h-[90vh]">
          <div className="max-w-md mx-auto w-full">
            <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-black tracking-tighter">PreRescate<span className="text-primary">PTY</span></span>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h1 className="text-3xl font-black tracking-tight mb-2">Crear Cuenta</h1>
              {selectedPkg ? (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between gap-4 group">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#DA1A21]">Kit Seleccionado</p>
                    <p className="font-black text-white">{selectedPkg.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#DA1A21]">${selectedPkg.price}</p>
                    <p className="text-[10px] font-bold opacity-60">Pago Único</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 font-medium">Únete a PreRescate PTY y protege lo que más importa</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Correo Electrónico</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-white/30 transition-all shadow-sm"
                      placeholder="nombre@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Teléfono (WhatsApp)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-white/30 transition-all shadow-sm"
                      placeholder="+507 0000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Contraseña</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-white/30 transition-all shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Confirmar</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <CheckCircle2 className={`h-5 w-5 ${form.confirm && form.password === form.confirm ? 'text-emerald-500' : 'text-slate-400'} transition-colors`} />
                    </div>
                    <input
                      type="password"
                      required
                      value={form.confirm}
                      onChange={(e) => update("confirm", e.target.value)}
                      disabled={loading}
                      className={`w-full bg-slate-800/60 border ${form.confirm && form.password !== form.confirm ? 'border-red-500' : 'border-slate-600'} rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-white/30 transition-all shadow-sm`}
                      placeholder="Repite..."
                    />
                  </div>
                </div>
              </div>

              <div className="py-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded-lg border-slate-600 text-primary focus:ring-primary/20 bg-slate-800/60"
                  />
                  <span className="text-[11px] text-slate-400 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                    Acepto los <Link href="/legal/terminos" target="_blank" className="text-primary font-bold hover:underline">Términos</Link> y la <Link href="/legal/privacidad" target="_blank" className="text-primary font-bold hover:underline">Política de Privacidad</Link>. Autorizo el tratamiento de mis datos de salud conforme a estos documentos y a la normativa aplicable en Panamá.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-brand to-red-700 text-white font-black py-4 flex items-center justify-center gap-2 transition-all duration-300 shadow-button hover:shadow-button-hover active:scale-[0.98] disabled:opacity-70 group"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Comenzar Mi Protección <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm font-medium">
                ¿Ya eres parte de la red?{" "}
                <Link href="/login" className="text-primary font-black hover:underline ml-1">Inicia sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </main>
  );
}
