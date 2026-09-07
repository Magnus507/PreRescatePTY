"use client";

import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ActivationCodeRevealProps = {
  orderId: string;
  unitId: string;
  activationStatus: string;
};

type RevealResponse = {
  activationCode?: string;
  expiresAt?: string | null;
  error?: string;
};

export function ActivationCodeReveal({
  orderId,
  unitId,
  activationStatus,
}: ActivationCodeRevealProps) {
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    const confirmed = window.confirm(
      "Confirma que verificaste la identidad del cliente antes de revelar el código de activación. Este acceso quedará registrado."
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/operations/history/${encodeURIComponent(orderId)}/activation-code?unitId=${encodeURIComponent(unitId)}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "x-prerescate-reveal": "activation-code",
          },
        }
      );
      const payload = (await res.json()) as RevealResponse;
      if (!res.ok || !payload.activationCode) {
        throw new Error(payload.error || "No se pudo revelar el código de activación");
      }
      setActivationCode(payload.activationCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revelar el código de activación");
    } finally {
      setLoading(false);
    }
  };

  if (activationStatus === "activated" && !activationCode) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>El código ya fue consumido porque esta unidad está activada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Código de activación
          </p>
          {activationCode ? (
            <p className="mt-1 break-all font-mono text-base font-black tracking-wide text-slate-950 dark:text-white">
              {activationCode}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Oculto por defecto. Revélalo solo después de validar al cliente.
            </p>
          )}
        </div>

        {activationCode ? (
          <button
            type="button"
            onClick={() => setActivationCode(null)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <EyeOff className="h-4 w-4" />
            Ocultar
          </button>
        ) : (
          <button
            type="button"
            onClick={reveal}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {loading ? "Verificando…" : "Ver código"}
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-200/70">
        El enlace administrativo de activación continúa oculto y el código no se guarda en el navegador.
      </p>
    </div>
  );
}
