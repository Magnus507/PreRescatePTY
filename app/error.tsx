"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application boundary error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div>
        <h1 className="text-3xl font-black text-slate-900">No pudimos cargar esta pantalla</h1>
        <p className="mt-3 text-slate-600">Intenta nuevamente. Si el problema continúa, contacta a soporte.</p>
        <button onClick={reset} className="mt-8 rounded-xl bg-brand px-5 py-3 font-bold text-white">
          Reintentar
        </button>
      </div>
    </main>
  );
}
