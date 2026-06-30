"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Package,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Smartphone,
  FileText,
  Layers,
  LockKeyhole,
  Printer,
  RefreshCw,
  Sticker,
  Truck,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface UnitType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const UNIT_TYPES: UnitType[] = [
  {
    key: "individual",
    label: "Paquete Individual",
    icon: Package,
    description: "Paquete con un chip y accesorios",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "box",
    label: "Caja Corporativa",
    icon: PackageCheck,
    description: "Caja con múltiples paquetes",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "kit",
    label: "Kit",
    icon: Layers,
    description: "Kit combinado personalizado",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "envelope",
    label: "Sobre",
    icon: FileText,
    description: "Sobre de activación",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "packing_list",
    label: "Packing List",
    icon: ClipboardCheck,
    description: "Lista de empaque",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Producto aprobado por QC", icon: CheckCircle2, description: "Aprobacion previa" },
  { label: "Paquete individual", icon: Package, description: "Armado unitario" },
  { label: "Verificar contenido", icon: ClipboardCheck, description: "Checklist operativo" },
  { label: "Sellar", icon: LockKeyhole, description: "Cierre de paquete" },
  { label: "Stock: inventario terminado", icon: ShieldCheck, description: "Ruta stock normal" },
  { label: "Empresa: caja corporativa", icon: PackageCheck, description: "Agrupar por empresa" },
  { label: "Packing list", icon: FileText, description: "Listado de caja" },
  { label: "Despacho", icon: Truck, description: "Salida final" },
];

const CHECKLIST_ITEMS = [
  { label: "Chip incluido", icon: Smartphone },
  { label: "QR verificado", icon: QrCode },
  { label: "Pulsera incluida", icon: Layers },
  { label: "Credencial incluida", icon: FileText },
  { label: "Sobre de activación incluido", icon: FileText },
  { label: "Etiqueta interna colocada", icon: Sticker },
  { label: "Paquete sellado", icon: ShieldCheck },
];

const FUTURE_ACTIONS = [
  { label: "Crear paquete", icon: Package, description: "Disponible desde Crear empaque" },
  { label: "Escanear QR", icon: QrCode, description: "Pendiente de backend" },
  { label: "Sellar paquete", icon: LockKeyhole, description: "Se activara con Prisma ERP" },
  { label: "Generar packing list", icon: ClipboardCheck, description: "Pendiente de backend" },
  { label: "Cerrar caja", icon: PackageCheck, description: "Se activara con Prisma ERP" },
  { label: "Imprimir etiquetas", icon: Printer, description: "Pendiente de backend" },
  { label: "Listo para despacho", icon: Truck, description: "Se activara con Prisma ERP" },
];

interface ProductionOrderOption {
  id: string;
  code: string;
  title: string;
  status: string;
  plannedQuantity: number;
  producedQuantity: number;
  outputType: string;
}

interface QcInspectionOption {
  id: string;
  code: string;
  status: string;
  inspectionType: string;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  productionOrder?: ProductionOrderOption | null;
}

interface PackingBatch {
  id: string;
  code: string;
  productionOrderId: string | null;
  qcInspectionId: string | null;
  status: string;
  packageType: string;
  plannedQuantity: number;
  packedQuantity: number;
  rejectedQuantity: number;
  labelCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  productionOrder: ProductionOrderOption | null;
  qcInspection: QcInspectionOption | null;
}

interface PackingBatchFormState {
  code: string;
  packageType: string;
  plannedQuantity: string;
  productionOrderId: string;
  qcInspectionId: string;
  labelCode: string;
  notes: string;
}

const EMPTY_PACKING_FORM: PackingBatchFormState = {
  code: "",
  packageType: "standard",
  plannedQuantity: "",
  productionOrderId: "",
  qcInspectionId: "",
  labelCode: "",
  notes: "",
};

const PACKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  in_progress: { label: "En progreso", color: "bg-blue-50 border-blue-200 text-blue-800" },
  completed: { label: "Completado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-800" },
};

export function PackingSection() {
  const [packingBatches, setPackingBatches] = useState<PackingBatch[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrderOption[]>([]);
  const [qcInspections, setQcInspections] = useState<QcInspectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PackingBatchFormState>(EMPTY_PACKING_FORM);

  const loadPackingBatches = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/packing-batches", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar batches de empaque");
      }

      setPackingBatches(Array.isArray(data.packingBatches) ? data.packingBatches : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar batches de empaque";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadProductionOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/production-orders", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar ordenes de produccion");
      }

      setProductionOrders(Array.isArray(data.productionOrders) ? data.productionOrders : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar ordenes de produccion";
      toast.error(message);
    }
  }, []);

  const loadQcInspections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/qc-inspections", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar inspecciones QC");
      }

      setQcInspections(Array.isArray(data.qcInspections) ? data.qcInspections : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar inspecciones QC";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    loadPackingBatches();
    loadProductionOrders();
    loadQcInspections();
  }, [loadPackingBatches, loadProductionOrders, loadQcInspections]);

  const metrics = useMemo(() => {
    return packingBatches.reduce(
      (acc, batch) => {
        if (batch.status === "draft" || batch.status === "in_progress") {
          acc.pending += 1;
        }

        acc.assembled += batch.packedQuantity;
        acc.verified += Math.max(batch.packedQuantity - batch.rejectedQuantity, 0);

        if (batch.status === "completed") {
          acc.ready += 1;
        }

        return acc;
      },
      { pending: 0, assembled: 0, verified: 0, ready: 0 }
    );
  }, [packingBatches]);

  const selectableQcInspections = useMemo(() => {
    const preferredStatuses = new Set(["completed", "rework_required"]);
    return [...qcInspections].sort((a, b) => {
      const aPreferred = preferredStatuses.has(a.status) ? 0 : 1;
      const bPreferred = preferredStatuses.has(b.status) ? 0 : 1;
      return aPreferred - bPreferred || a.code.localeCompare(b.code);
    });
  }, [qcInspections]);

  const selectableProductionOrders = useMemo(() => {
    return [...productionOrders].sort((a, b) => a.code.localeCompare(b.code));
  }, [productionOrders]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const updateForm = (field: keyof PackingBatchFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_PACKING_FORM);
  };

  const handleCreatePackingBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const plannedQuantity = form.plannedQuantity.trim() ? Number(form.plannedQuantity) : 0;

    if (!code) {
      toast.error("Code es requerido");
      return;
    }

    if (!Number.isInteger(plannedQuantity) || plannedQuantity < 0) {
      toast.error("plannedQuantity debe ser entero y no negativo");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/packing-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          packageType: form.packageType.trim() || "standard",
          plannedQuantity,
          productionOrderId: form.productionOrderId || null,
          qcInspectionId: form.qcInspectionId || null,
          labelCode: form.labelCode.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe un batch de empaque con ese code");
        }
        throw new Error(data.error || "No se pudo crear batch de empaque");
      }

      toast.success("Batch de empaque creado");
      setShowCreateModal(false);
      setForm(EMPTY_PACKING_FORM);
      await loadPackingBatches({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear batch de empaque";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <PackageCheck className="h-8 w-8 text-primary" />
          Empaque
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Armado fisico de paquetes, salida a inventario terminado o caja corporativa antes del despacho.
        </p>
      </div>

      {/* Mensaje diferenciador */}
      <div className="rounded-3xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 dark:bg-blue-900/50">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 mb-2">
              Este módulo controlará el armado físico de paquetes y cajas antes del despacho
            </h3>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              El empaque recibe producto aprobado por QC. Si es stock normal, entra a inventario terminado; si es empresa,
              se agrupa por empleado y caja corporativa con packing list antes de despacho.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Empaque */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Empaque
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center min-w-[100px]">
                  <div className="rounded-xl bg-slate-100 p-2 mb-2 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {step.label}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 mt-1">
                    {step.description}
                  </p>
                </div>
                {!isLast && (
                  <div className="mx-2 text-slate-300 dark:text-slate-700">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Pendientes
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.pending}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Armados
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.assembled}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Verificados
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.verified}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Listos
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.ready}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Batches de empaque
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear empaque
            </button>
            <button
              type="button"
              onClick={() => loadPackingBatches({ silent: true })}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : packingBatches.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <PackageCheck className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay batches de empaque registrados
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Los batches creados desde esta seccion apareceran aqui con trazabilidad por eventos.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Produccion</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">QC</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Empacado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Rechazado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Etiqueta</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packingBatches.map((batch) => {
                  const status = PACKING_STATUS_CONFIG[batch.status] || {
                    label: batch.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div>
                          <span className="font-mono text-xs font-black text-primary">{batch.code}</span>
                          {batch.notes && (
                            <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{batch.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {batch.productionOrder ? (
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900">{batch.productionOrder.code}</p>
                            <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">
                              {batch.productionOrder.title}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sin orden</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {batch.qcInspection ? (
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900">{batch.qcInspection.code}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">{batch.qcInspection.status}</p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sin QC</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{batch.packageType}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">{batch.plannedQuantity}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-blue-700">{batch.packedQuantity}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-red-700">{batch.rejectedQuantity}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{batch.labelCode || "Sin etiqueta"}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(batch.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(batch.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tipos de Unidad */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Unidad
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {UNIT_TYPES.map((unit) => {
            const Icon = unit.icon;
            return (
              <div
                key={unit.key}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${unit.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {unit.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {unit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist por Paquete */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Checklist por Paquete
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 opacity-60"
              >
                <div className="rounded-lg bg-slate-200 p-1.5">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones futuras */}
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Acciones del flujo
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {FUTURE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                disabled
                className="rounded-2xl border border-slate-200 bg-white p-4 opacity-50 cursor-not-allowed"
                title={action.description}
              >
                <Icon className="mb-3 h-5 w-5 text-slate-500" />
                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  {action.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreatePackingBatch} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Empaque</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear batch de empaque</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Agrupa producto aprobado por QC antes de inventario terminado o despacho.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Code</span>
                  <input
                    required
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="PACK-STOCK-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                  <input
                    value={form.packageType}
                    onChange={(event) => updateForm("packageType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="standard"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad planificada</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.plannedQuantity}
                    onChange={(event) => updateForm("plannedQuantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Etiqueta</span>
                  <input
                    value={form.labelCode}
                    onChange={(event) => updateForm("labelCode", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="BOX-001"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inspeccion QC</span>
                  <select
                    value={form.qcInspectionId}
                    onChange={(event) => updateForm("qcInspectionId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Sin QC vinculado</option>
                    {selectableQcInspections.map((inspection) => (
                      <option key={inspection.id} value={inspection.id}>
                        {inspection.code} · {inspection.status}
                        {inspection.productionOrder ? ` · ${inspection.productionOrder.code}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Se muestran primero QC completed o rework_required. El backend solo acepta esos estados al vincular QC.
                  </p>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Orden de produccion</span>
                  <select
                    value={form.productionOrderId}
                    onChange={(event) => updateForm("productionOrderId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Sin orden vinculada</option>
                    {selectableProductionOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.code} · {order.title} · {order.status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de empaque"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar empaque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
