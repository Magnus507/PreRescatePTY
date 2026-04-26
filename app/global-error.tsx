"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="font-sans">
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
            <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-100">
                <div className="bg-red-50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto border border-red-100">
                    <AlertCircle className="h-12 w-12 text-red-600 animate-pulse" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                        Error Crítico de Aplicación
                    </h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Nuestro sistema ha detectado una interrupción inesperada. El reporte de error ha sido enviado automáticamente al equipo técnico de PreRescate.
                    </p>
                </div>
                <button
                    onClick={() => reset()}
                    className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                    Reiniciar Sistema <RefreshCw className="h-6 w-6" />
                </button>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Protocolo de Recuperación V.2
                </p>
            </div>
        </div>
      </body>
    </html>
  );
}
