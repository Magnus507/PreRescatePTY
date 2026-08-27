"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { FinishedGoodsSection } from "./FinishedGoodsSection";

interface PhysicalUnitMetrics {
  total: number;
  available: number;
  reserved: number;
  qaPending: number;
  qaFailed: number;
  dispatched: number;
  delivered: number;
  activated: number;
}

function valueOrZero(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function PhysicalInventorySection() {
  const [metrics, setMetrics] = useState<PhysicalUnitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/admin/operations/dashboard?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar inventario físico");
      setMetrics(data.dashboard?.physicalUnits || null);
    } catch (error) {
      console.error("PHYSICAL_INVENTORY_METRICS_ERROR", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const cards = [
    {
      label: "Listas para picking",
      value: valueOrZero(metrics?.available),
      detail: "QA aprobado · sin activar",
      icon: PackageCheck,
      classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
      iconClasses: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Reservadas a pedidos",
      value: valueOrZero(metrics?.reserved),
      detail: "Ya tienen pedido asociado",
      icon: ShieldCheck,
      classes: "border-blue-200 bg-blue-50 text-blue-900",
      iconClasses: "bg-blue-100 text-blue-700",
    },
    {
      label: "Pendientes de QC",
      value: valueOrZero(metrics?.qaPending),
      detail: "No deben salir a cliente",
      icon: ClipboardCheck,
      classes: "border-amber-200 bg-amber-50 text-amber-950",
      iconClasses: "bg-amber-100 text-amber-700",
    },
    {
      label: "QC rechazado",
      value: valueOrZero(metrics?.qaFailed),
      detail: "Reproceso o descarte",
      icon: Boxes,
      classes: "border-red-200 bg-red-50 text-red-950",
      iconClasses: "bg-red-100 text-red-700",
    },
    {
      label: "En despacho",
      value: valueOrZero(metrics?.dispatched),
      detail: "Ya salieron del inventario",
      icon: Truck,
      classes: "border-violet-200 bg-violet-50 text-violet-950",
      iconClasses: "bg-violet-100 text-violet-700",
    },
    {
      label: "Activadas",
      value: valueOrZero(metrics?.activated),
      detail: "Identidad ya vinculada",
      icon: CheckCircle2,
      classes: "border-slate-200 bg-white text-slate-950",
      iconClasses: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_-55px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Boxes className="h-4 w-4" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Inventario físico trazable</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Cada unidad tiene identidad, estado y destino</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              La etiqueta interna es el identificador que debes buscar físicamente. Una unidad solo aparece disponible para picking cuando pasó QC, no está activada y no pertenece a otro pedido.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadMetrics({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-white disabled:opacity-60 lg:self-auto"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar stock
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className={`rounded-2xl border p-4 ${card.classes}`}>
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${card.iconClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-black tracking-tight">{loading ? "—" : card.value}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em]">{card.label}</p>
                <p className="mt-1 text-[9px] font-semibold opacity-65">{card.detail}</p>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 bg-slate-50 px-6 py-3 text-[9px] font-bold text-slate-500">
          <span>Total trazable: {loading ? "—" : valueOrZero(metrics?.total)}</span>
          <span>Entregadas: {loading ? "—" : valueOrZero(metrics?.delivered)}</span>
          <span className="text-slate-700">Disponible ≠ balance contable: aquí manda la unidad física y su estado real.</span>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Catálogo y configuración</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Productos base, tienda y movimientos</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Esta zona administra SKUs, publicación y balance. Para picking y trazabilidad usa “Ver unidades” y la etiqueta interna de cada pieza.
          </p>
        </div>
        <FinishedGoodsSection />
      </section>
    </div>
  );
}
