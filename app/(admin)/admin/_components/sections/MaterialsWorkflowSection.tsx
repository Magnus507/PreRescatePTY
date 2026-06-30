"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Factory,
  Loader2,
  MapPin,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  Scale,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

interface OperationMaterial {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  status: string;
  supplierName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  balance: number;
}

const MATERIAL_TASKS = [
  { label: "Recibir materiales", detail: "Registrar entrada fisica desde proveedor.", icon: PackagePlus },
  { label: "Asignar ubicacion", detail: "Bodega, estante, caja o mesa de trabajo.", icon: MapPin },
  { label: "Registrar proveedor", detail: "Proveedor, contacto y condicion de compra.", icon: Truck },
  { label: "Registrar cantidad", detail: "Unidades, paquetes o rollos recibidos.", icon: Scale },
  { label: "Registrar lote/factura", detail: "Factura, lote proveedor y evidencia.", icon: ReceiptText },
  { label: "Ver stock bajo", detail: "Alertas para reposicion de materiales.", icon: AlertTriangle },
];

export function MaterialsWorkflowSection() {
  const [materials, setMaterials] = useState<OperationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMaterials = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/materials", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar materiales");
      }

      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar materiales";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <Archive className="h-4 w-4" />
              Inventario fisico de insumos
            </div>
            <h3 className="text-2xl font-black tracking-tight text-amber-950">Materiales</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-800">
              Materiales son insumos antes de fabricar: stickers en blanco, pulseras, PVC, cajas y accesorios. No son productos terminados y no son chips digitales.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-amber-700">
            API conectada
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {MATERIAL_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <article key={task.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h4 className="font-black text-slate-950">{task.label}</h4>
              <p className="mt-2 text-sm font-medium text-slate-500">{task.detail}</p>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Materiales registrados</h3>
          </div>
          <button
            type="button"
            onClick={() => loadMaterials({ silent: true })}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : materials.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Archive className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay materiales registrados
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Los materiales creados desde el API administrativo apareceran aqui.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-black text-primary">{material.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-black text-slate-900">{material.name}</p>
                        {material.supplierName && (
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">{material.supplierName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600">{material.category}</td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600">{material.unit}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        {material.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono text-sm font-black text-slate-900">{material.balance}</span>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(material.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
