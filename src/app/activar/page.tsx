"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Shield, Loader2, CheckCircle, Key } from "lucide-react";

export default function ActivarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ shortCode: string; serialPublic: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!session) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/chips/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationCode: code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al activar chip");
      return;
    }

    setSuccess({ shortCode: data.chip.shortCode, serialPublic: data.chip.serialPublic });
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Key className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Activar Mi Chip</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa el código de activación que viene con tu chip PreRescate
            </p>
          </div>

          {success ? (
            <div className="p-8 rounded-2xl border border-success/30 bg-success/5 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
              <h2 className="text-xl font-bold">¡Chip Activado!</h2>
              <p className="text-muted-foreground">
                Serial: <span className="font-mono font-semibold">{success.serialPublic}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Tu perfil de emergencia estará disponible en:
              </p>
              <code className="block px-4 py-2 rounded-lg bg-muted font-mono text-sm">
                pre-rescate-pty.vercel.app/e/{success.shortCode}
              </code>
              <div className="pt-4 space-y-2">
                <Link href="/dashboard/perfil" className="block w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold hover:bg-primary/90 transition-colors text-center">
                  Completar Mi Perfil Médico
                </Link>
                <Link href="/dashboard" className="block w-full rounded-lg border border-border py-2.5 font-medium hover:bg-accent transition-colors text-center text-sm">
                  Ir al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-5 p-8 rounded-2xl border border-border bg-card shadow-sm">
              {!session && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                  Debes <Link href="/login" className="text-primary font-medium hover:underline">iniciar sesión</Link> o <Link href="/registro" className="text-primary font-medium hover:underline">crear una cuenta</Link> antes de activar tu chip.
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
              )}

              <div>
                <label htmlFor="activation-code" className="block text-sm font-medium mb-1.5">Código de Activación</label>
                <input
                  id="activation-code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  El código de activación viene impreso en el empaque de tu chip PreRescate.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !session}
                className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? "Activando..." : "Activar Chip"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
