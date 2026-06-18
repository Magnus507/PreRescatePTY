"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { 
  Eye, EyeOff, CheckCircle2, ShieldAlert
} from "lucide-react";

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-in fade-in duration-500 bg-[#050812]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="h-10 w-10 rounded-full border-4 border-brand/20 border-b-brand animate-spin-slow absolute top-3 left-3" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      const res = await withTimeout(
        signIn("credentials", {
          redirect: false,
          email,
          password,
          mfaCode: requiresMfa ? mfaCode : undefined,
        }),
        15000,
        "LOGIN_TIMEOUT"
      );

      if (res?.error) {
        if (res.error.includes("MFA_REQUIRED")) {
          setRequiresMfa(true);
        } else {
          setError(res.error || "Credenciales inválidas. Por favor intenta de nuevo.");
        }
        setLoading(false);
      } else if (res?.ok) {
        setIsSuccess(true);
        setIsRedirecting(true);
        // Delay slightly for success animation, then do a full navigation
        // to ensure the SessionProvider hydrates with the fresh session
        setTimeout(async () => {
          try {
            const sessionRes = await withTimeout(
              fetch("/api/auth/session"),
              10000,
              "SESSION_TIMEOUT"
            );
            const session = await sessionRes.json();
            const role = session?.user?.role;

            if (role === "admin" || role === "superadmin" || role === "imprenta") {
              window.location.href = "/admin";
            } else {
              window.location.href = "/dashboard";
            }
          } catch (err) {
            console.error("[login] Session fetch/redirect error", err);
            setError("El servidor tardó demasiado en responder. Intenta nuevamente.");
            setIsSuccess(false);
            setIsRedirecting(false);
            setLoading(false);
          }
        }, 800);
      } else {
        setError("No pudimos iniciar sesión. Verifica tu conexión e intenta nuevamente.");
      }
    } catch (err) {
      console.error("[login] Sign-in error", err);
      if (err instanceof Error && err.message === "LOGIN_TIMEOUT") {
        setError("El servidor tardó demasiado en responder. Intenta nuevamente.");
      } else {
        setError("No pudimos iniciar sesión. Verifica tu conexión e intenta nuevamente.");
      }
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.12),_transparent_28%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(218,26,33,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          {/* Left: Brand panel — hidden on mobile */}
          <section className="hidden lg:block rounded-[3rem] border border-white/10 bg-white/5 p-10 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
            <span className="inline-flex rounded-full bg-brand/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-brand">Acceso seguro</span>
            <h1 className="mt-8 text-5xl font-black tracking-tight max-w-2xl">Vuelve a tu panel médico en segundos.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Inicia sesión para gestionar tu perfil médico, revisar tus dispositivos NFC/QR y mantener a tus primeros respondedores informados cuando más te necesitan.</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Acceso rápido", detail: "Haz login y accede a tu perfil desde cualquier dispositivo." },
                { label: "Protección Ley 81", detail: "Tus datos médicos se almacenan con el máximo cumplimiento." },
                { label: "Información de emergencia", detail: "Comparte detalles críticos con un solo click." },
                { label: "Soporte prioritario", detail: "Recibe ayuda rápida cuando lo necesites." },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-black mb-2">{item.label}</p>
                  <p className="text-base leading-relaxed text-slate-200">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">Accede con confianza</p>
              <p className="mt-4 text-slate-300 leading-relaxed">Si tienes MFA activado, el sistema te pedirá tu código de seguridad después de tus credenciales.</p>
            </div>
          </section>

          {/* Right: Login form */}
          <section className="rounded-[3rem] border border-white/10 bg-slate-950/90 p-10 shadow-2xl">
            <div className="mb-10">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">Inicia sesión</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">
                <span className="text-brand">PRE</span>{' '}
                <span className="text-white">RESCUE</span>{' '}
                <span className="text-brand">ID</span>
              </h2>
              <p className="mt-3 text-slate-400 leading-relaxed">Usa tu email y contraseña para entrar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 text-red-600 dark:text-red-400 text-sm font-semibold border border-red-200 dark:border-red-900/40 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              {isSuccess && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ¡Autenticación exitosa! Redirigiendo...
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="login-email" className="text-xs uppercase tracking-[0.35em] text-slate-400 font-black">Correo electrónico</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || isSuccess}
                  className="w-full rounded-[1.75rem] border-2 border-white/10 bg-slate-900/90 px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 input-premium"
                  placeholder="nombre@ejemplo.com"
                />
              </div>

              {!requiresMfa ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="login-password" className="text-xs uppercase tracking-[0.35em] text-slate-400 font-black">Contraseña</label>
                    <Link href="/forgot-password" className="text-xs font-bold text-brand hover:text-white transition-colors">¿La olvidaste?</Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || isSuccess}
                      className="w-full rounded-[1.75rem] border-2 border-white/10 bg-slate-900/90 px-5 py-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 input-premium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-blue-400/10 bg-blue-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-blue-200 font-black">Paso extra</p>
                    <p className="mt-2 text-sm text-blue-100 leading-relaxed">Ingresa tu código de 6 dígitos para completar el acceso seguro.</p>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    disabled={loading || isSuccess}
                    className="w-full rounded-[1.75rem] border-2 border-white/10 bg-slate-900/90 px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 input-premium"
                    placeholder="000000"
                  />
                  <button
                    type="button"
                    onClick={() => setRequiresMfa(false)}
                    className="w-full text-sm font-black uppercase tracking-[0.25em] text-slate-400 hover:text-white transition"
                  >
                    Volver a contraseña
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isSuccess}
                className="w-full rounded-[2rem] bg-gradient-to-r from-brand to-red-700 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-white shadow-button hover:shadow-button-hover transition-all disabled:opacity-60"
              >
                {loading ? "Iniciando sesión..." : "Iniciar sesión seguro"}
              </button>
            </form>

            <p className="mt-10 text-center text-sm text-slate-400">
              ¿Nuevo en PreRescate PTY? <Link href="/registro" className="text-brand font-black hover:underline">Crea tu cuenta</Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}