"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

export default function ActivarPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir siempre al dashboard integrado
    // Si no está logueado, el dashboard lo mandará a login solo
    router.replace("/dashboard/chips?activate=true");
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(218,26,33,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="glass-premium border border-white/10 shadow-premium backdrop-blur-3xl p-10 rounded-[2.5rem] text-center max-w-md w-full">
          <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-glow">
            <Shield className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-3">Sincronizando Protección</h2>
          <p className="text-slate-300 font-medium leading-relaxed">
            Cargando el centro de activación integrado en tu panel. Pronto estarás listo para usar tus chips con total seguridad.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-white/80">
            Activación en progreso
          </div>
          <div className="mt-8 mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center shadow-button">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
