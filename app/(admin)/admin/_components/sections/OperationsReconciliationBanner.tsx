"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function OperationsReconciliationBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [checking, setChecking] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/operations/reconciliation/customer-production?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo verificar conciliación");
      setPendingCount(Number(data.pendingCount) || 0);
    } catch (error) {
      console.error("OPERATIONS_RECONCILIATION_CHECK_ERROR", error);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const reconcile = async () => {
    if (reconciling) return;
    setReconciling(true);
    try {
      const res = await fetch("/api/admin/operations/reconciliation/customer-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo reconciliar la producción");

      const repaired = Number(data.reconciledCount) || 0;
      const failed = Number(data.failedCount) || 0;
      const remaining = Number(data.remainingCount) || 0;
      setPendingCount(remaining);

      if (failed > 0) {
        toast.warning(`Se reconciliaron ${repaired} unidades; ${failed} requieren revisión.`);
        return;
      }

      toast.success(
        repaired === 1
          ? "Unidad reconciliada y reservada al pedido."
          : `${repaired} unidades reconciliadas con sus pedidos.`
      );

      // The operations sections maintain their own client-side caches. A reload
      // after this explicit admin repair keeps Pedidos, Inventario and metrics in
      // sync without hiding stale state behind optimistic UI.
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reconciliar la producción");
    } finally {
      setReconciling(false);
    }
  };

  if (checking || pendingCount <= 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-black">Conciliación operativa pendiente</p>
          <p className="mt-1 text-xs font-semibold text-amber-800">
            {pendingCount === 1
              ? "Hay 1 unidad producida para un pedido cliente que quedó como inventario libre y puede reconciliarse de forma segura."
              : `Hay ${pendingCount} unidades producidas para pedidos cliente que quedaron como inventario libre y pueden reconciliarse de forma segura.`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={reconcile}
        disabled={reconciling}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-950 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
      >
        {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {reconciling ? "Reconciliando" : "Reconciliar y reservar"}
      </button>
    </div>
  );
}
