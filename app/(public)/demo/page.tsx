"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.12),_transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg glass-premium border border-white/10 shadow-premium backdrop-blur-3xl p-10 rounded-[2.5rem] text-center">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-glow">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-3">Cargando tu demo interactiva</h1>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">Un momento por favor, estamos preparando el recorrido de PreRescate PTY para que lo explores sin interrupciones.</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-white/80">
            Preparando la experiencia premium
          </div>
        </div>
      </div>
    </div>
  );
}
