"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { 
  Shield, Eye, EyeOff, Loader2, ArrowRight, 
  Lock, Mail, HeartPulse, CheckCircle2, ShieldAlert
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    const errorMsg = searchParams.get("error");
    if (errorMsg === "CredentialsSignin") {
      setError("Credenciales inválidas. Por favor, verifica tu email y contraseña.");
    } else if (errorMsg) {
      setError("Ocurrió un error al intentar iniciar sesión.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        mfaCode: requiresMfa ? mfaCode : undefined,
      });

      if (res?.error) {
        if (res.error.includes("MFA_REQUIRED")) {
          setRequiresMfa(true);
        } else {
          setError(res.error || "Credenciales inválidas. Por favor intenta de nuevo.");
        }
        setLoading(false);
      } else {
        setIsSuccess(true);
        // Delay slightly for success animation, then do a full navigation
        // to ensure the SessionProvider hydrates with the fresh session
        setTimeout(async () => {
          const sessionRes = await fetch("/api/auth/session");
          const session = await sessionRes.json();
          const role = session?.user?.role;

          if (role === "admin" || role === "superadmin" || role === "imprenta") {
            window.location.href = "/admin";
          } else {
            window.location.href = "/dashboard";
          }
        }, 800);
      }
    } catch (err) {
      setError("Error de conexión. Inténtalo más tarde.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] p-4 md:p-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-red-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Branding & Info */}
        <div className="hidden md:flex md:w-[45%] bg-slate-950 p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-red-600/10"></div>
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 mb-16 group w-fit">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
                <Shield className="h-6 w-6 text-slate-950" />
              </div>
              <span className="text-xl font-black tracking-tighter">PreRescate<span className="text-blue-400">PTY</span></span>
            </Link>

            <h2 className="text-4xl font-black tracking-tight leading-tight mb-6">
              Cada segundo <br />
              <span className="text-blue-400">cuenta en una</span> <br />
              emergencia.
            </h2>
            
            <p className="text-slate-400 text-lg font-medium max-w-xs leading-relaxed">
              Inicia sesión para gestionar tus perfiles médicos y dispositivos NFC.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <HeartPulse className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-sm">Vital Sinc</p>
                <p className="text-xs text-slate-500">Datos médicos siempre listos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-black tracking-tighter">PreRescate<span className="text-primary">PTY</span></span>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h1 className="text-3xl font-black tracking-tight mb-2">Bienvenido de nuevo</h1>
              <p className="text-muted-foreground font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              {isSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3 animate-in zoom-in-95">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ¡Autenticación exitosa! Iniciando...
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Correo Electrónico</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || isSuccess}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="nombre@ejemplo.com"
                  />
                </div>
              </div>

              {!requiresMfa ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Contraseña</label>
                    <Link href="/forgot-password" title="Recuperar contraseña" className="text-xs font-bold text-primary hover:underline">¿La olvidaste?</Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || isSuccess}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-12 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Paso de Seguridad</p>
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-300">Ingresa el código de 6 dígitos de tu App Autenticadora.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Código de Verificación</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      disabled={loading || isSuccess}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="000000"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRequiresMfa(false)}
                    className="text-xs font-bold text-slate-400 hover:text-primary transition-colors text-center w-full"
                  >
                    Volver a contraseña
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isSuccess}
                className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Iniciar Sesión <ArrowRight className="h-5 w-5" /></>
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-slate-500 font-medium">
                ¿Aún no proteges tu vida?{" "}
                <Link href="/registro" className="text-primary font-black hover:underline ml-1">Crea una cuenta</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
