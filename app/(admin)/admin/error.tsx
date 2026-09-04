"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = /chunk|ChunkLoadError|Loading chunk failed/i.test(error?.message || "");

  useEffect(() => {
    console.error("Admin Domain Critical Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="h-20 w-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-red-500/10 mb-6">
        <AlertTriangle className="h-10 w-10" />
      </div>
      
      <div className="space-y-2 max-w-md">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Error en el Módulo Admin</h2>
        <p className="text-slate-500 font-medium">
          Ha ocurrido una interrupción inesperada en la infraestructura administrativa. Nuestros logs han registrado el evento.
        </p>
        {error.digest && <p className="mt-4 text-xs text-slate-400">Referencia: {error.digest}</p>}
      </div>

      <div className="flex gap-4 mt-10">
        {isChunkError && (
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Recargar versión nueva
          </button>
        )}
        <button
          onClick={reset}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          <RotateCcw className="h-4 w-4" /> Reintentar Carga
        </button>
        <Link
          href="/admin"
          className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Home className="h-4 w-4" /> Ir al Inicio
        </Link>
      </div>
    </div>
  );
}
