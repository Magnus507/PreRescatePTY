"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/public/demo");
        const data = await res.json();
        if (data.shortCode) {
          router.replace(`/e/${data.shortCode}?demo=true`);
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }
    load();
  }, [router]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#030416] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.10),_transparent_30%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-18 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] border border-white/8 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Explora la demo de PreRescate PTY</h1>
              <p className="mt-4 text-slate-300 max-w-lg">Estamos preparando una experiencia interactiva que muestra cómo funciona la app para primeros respondedores y usuarios. Esto solo toma unos segundos.</p>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href="/" className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 transition">Ir al inicio</Link>
                <a href="/registro" className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-red-700 px-5 py-3 text-sm font-black text-white shadow-button hover:shadow-button-hover transition">Crear cuenta</a>
              </div>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 h-28 w-28 rounded-full bg-primary/8 flex items-center justify-center text-primary shadow-glow">
                <Loader2 className="h-12 w-12 animate-spin" />
              </div>
              <p className="text-sm text-slate-400">Carga en progreso — si tarda más de 10 segundos, intenta recargar la página o vuelve al inicio.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
