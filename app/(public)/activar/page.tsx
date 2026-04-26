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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="h-20 w-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary/5">
          <Shield className="h-10 w-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Sincronizando Protección</h2>
          <p className="text-slate-500 font-medium">Cargando el centro de activación integrado...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
      </div>
    </div>
  );
}
