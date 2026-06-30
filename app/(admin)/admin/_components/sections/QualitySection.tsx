"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  Monitor,
  Package,
  PackageCheck,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
  Sticker,
  Scan,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ValidationType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const VALIDATION_TYPES: ValidationType[] = [
  {
    key: "nfc",
    label: "NFC",
    icon: Smartphone,
    description: "Lectura, escritura y UID",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "qr",
    label: "QR",
    icon: QrCode,
    description: "Escáneo, URL y resolución",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "personalization",
    label: "Personalización",
    icon: Printer,
    description: "Nombre, empresa y datos",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "material",
    label: "Material",
    icon: Layers,
    description: "Color, impresión y acabado",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "packaging",
    label: "Empaque",
    icon: Package,
    description: "Contenido completo y accesorios",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "documentation",
    label: "Documentación",
    icon: FileText,
    description: "Packing list y etiquetas",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Producción terminada", icon: CheckCircle2, description: "Orden completada" },
  { label: "Inspección visual", icon: Monitor, description: "Revisión física" },
  { label: "Prueba NFC / QR", icon: Scan, description: "Validación técnica" },
  { label: "Checklist", icon: ClipboardCheck, description: "Verificación final" },
  { label: "Aprobado o Reproceso", icon: RefreshCw, description: "Decisión final" },
  { label: "Empaque", icon: PackageCheck, description: "Siguiente paso" },
];

const CHECKLIST_ITEMS = [
  { label: "NFC responde correctamente", icon: Smartphone },
  { label: "QR abre correctamente", icon: QrCode },
  { label: "Datos impresos correctos", icon: Printer },
  { label: "Personalización correcta", icon: FileText },
  { label: "Material sin defectos", icon: Layers },
  { label: "Accesorios completos", icon: Package },
  { label: "Etiqueta correcta", icon: Sticker },
  { label: "Listo para empaque", icon: PackageCheck },
];

const RESULTS = [
  { label: "Aprobado", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Requiere reproceso", icon: RefreshCw, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Rechazado", icon: XCircle, color: "bg-red-50 text-red-700 border-red-200" },
  { label: "Scrap", icon: AlertTriangle, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { label: "Aprobado con excepción", icon: ShieldCheck, color: "bg-orange-50 text-orange-700 border-orange-200" },
];

const BENEFITS = [
  { label: "Evitar errores", description: "Detección temprana de fallos" },
  { label: "Reducir devoluciones", description: "Productos verificados antes de salir" },
  { label: "Asegurar trazabilidad", description: "Registro de cada inspección" },
  { label: "Proteger la marca", description: "Calidad consistente" },
  { label: "Validar personalización", description: "Cada producto es único" },
  { label: "Garantizar funcionamiento NFC", description: "Prueba técnica obligatoria" },
  { label: "Garantizar lectura QR", description: "Escáneo de verificación" },
  { label: "Auditoría completa", description: "Historial de calidad" },
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

interface QcInspection {
  id: string;
  code: string;
  productionOrderId: string | null;
  status: string;
  inspectionType: string;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  productionOrder: ProductionOrderOption | null;
}

interface QcInspectionFormState {
  code: string;
  productionOrderId: string;
  inspectionType: string;
  notes: string;
}

type QcEventType =
  | "STARTED"
  | "PASSED"
  | "FAILED"
  | "REWORK_REQUIRED"
  | "COMPLETED"
  | "CANCELLED";

interface QuantityEventFormState {
  quantity: string;
  reason: string;
}

const EMPTY_QC_FORM: QcInspectionFormState = {
  code: "",
  productionOrderId: "",
  inspectionType: "standard",
  notes: "",
};

const EMPTY_QUANTITY_EVENT_FORM: QuantityEventFormState = {
  quantity: "",
  reason: "",
};

const QC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-50 border-amber-200 text-amber-800" },
  in_progress: { label: "En progreso", color: "bg-blue-50 border-blue-200 text-blue-800" },
  rework_required: { label: "Reproceso", color: "bg-orange-50 border-orange-200 text-orange-800" },
  completed: { label: "Completada", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelada", color: "bg-red-50 border-red-200 text-red-800" },
};

const QC_EVENT_SUCCESS_COPY: Record<QcEventType, string> = {
  STARTED: "QC iniciado",
  PASSED: "Cantidad aprobada",
  FAILED: "Cantidad rechazada",
  REWORK_REQUIRED: "Reproceso marcado",
  COMPLETED: "QC completado",
  CANCELLED: "QC cancelado",
};

const QC_ACTIONS_BY_STATUS: Record<string, Array<{ label: string; eventType: QcEventType; tone: string }>> = {
  pending: [
    { label: "Iniciar QC", eventType: "STARTED", tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  in_progress: [
    { label: "Aprobar cantidad", eventType: "PASSED", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
    { label: "Rechazar cantidad", eventType: "FAILED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
    { label: "Marcar reproceso", eventType: "REWORK_REQUIRED", tone: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100" },
    { label: "Completar", eventType: "COMPLETED", tone: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  rework_required: [
    { label: "Reanudar QC", eventType: "STARTED", tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
    { label: "Completar", eventType: "COMPLETED", tone: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
};

export function QualitySection() {
  const [qcInspections, setQcInspections] = useState<QcInspection[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [quantityEvent, setQuantityEvent] = useState<{
    inspection: QcInspection;
    eventType: "PASSED" | "FAILED";
  } | null>(null);
  const [quantityEventForm, setQuantityEventForm] = useState<QuantityEventFormState>(EMPTY_QUANTITY_EVENT_FORM);
  const [form, setForm] = useState<QcInspectionFormState>(EMPTY_QC_FORM);

  const loadQcInspections = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

  useEffect(() => {
    loadQcInspections();
    loadProductionOrders();
  }, [loadQcInspections, loadProductionOrders]);

  const metrics = useMemo(() => {
    return qcInspections.reduce(
      (acc, inspection) => {
        if (inspection.status === "pending" || inspection.status === "in_progress") {
          acc.pending += 1;
        }

        if (inspection.status === "completed") {
          acc.approved += inspection.passedQuantity;
        }

        acc.rejected += inspection.failedQuantity;

        if (inspection.status === "rework_required") {
          acc.rework += 1;
        }

        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, rework: 0 }
    );
  }, [qcInspections]);

  const selectableProductionOrders = useMemo(() => {
    const preferredStatuses = new Set(["completed", "started"]);
    return [...productionOrders].sort((a, b) => {
      const aPreferred = preferredStatuses.has(a.status) ? 0 : 1;
      const bPreferred = preferredStatuses.has(b.status) ? 0 : 1;
      return aPreferred - bPreferred || a.code.localeCompare(b.code);
    });
  }, [productionOrders]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const updateForm = (field: keyof QcInspectionFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_QC_FORM);
  };

  const openQuantityEventModal = (inspection: QcInspection, eventType: "PASSED" | "FAILED") => {
    setQuantityEvent({ inspection, eventType });
    setQuantityEventForm(EMPTY_QUANTITY_EVENT_FORM);
  };

  const closeQuantityEventModal = () => {
    if (savingEventKey) return;
    setQuantityEvent(null);
    setQuantityEventForm(EMPTY_QUANTITY_EVENT_FORM);
  };

  const updateQuantityEventForm = (field: keyof QuantityEventFormState, value: string) => {
    setQuantityEventForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateInspection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const inspectionType = form.inspectionType.trim() || "standard";

    if (!code) {
      toast.error("Code es requerido");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/qc-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          productionOrderId: form.productionOrderId || null,
          inspectionType,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe una inspeccion QC con ese code");
        }
        throw new Error(data.error || "No se pudo crear la inspeccion QC");
      }

      toast.success("Inspeccion QC creada");
      setShowCreateModal(false);
      setForm(EMPTY_QC_FORM);
      await loadQcInspections({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear inspeccion QC";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const postQcEvent = async ({
    inspection,
    eventType,
    quantity,
    reason,
  }: {
    inspection: QcInspection;
    eventType: QcEventType;
    quantity?: number;
    reason?: string | null;
  }) => {
    const eventKey = `${inspection.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/qc-inspections/${inspection.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          quantity,
          passedQuantity: eventType === "PASSED" ? quantity : undefined,
          failedQuantity: eventType === "FAILED" ? quantity : undefined,
          reason: reason || null,
          metadataJson: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el evento QC");
      }

      toast.success(QC_EVENT_SUCCESS_COPY[eventType]);
      await loadQcInspections({ silent: true });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar evento QC";
      toast.error(message);
      return false;
    } finally {
      setSavingEventKey(null);
    }
  };

  const handleQcAction = async (inspection: QcInspection, eventType: QcEventType) => {
    if (eventType === "PASSED" || eventType === "FAILED") {
      openQuantityEventModal(inspection, eventType);
      return;
    }

    await postQcEvent({
      inspection,
      eventType,
      reason: QC_EVENT_SUCCESS_COPY[eventType],
    });
  };

  const handleQuantityEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quantityEvent) return;

    const quantity = Number(quantityEventForm.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad debe ser positiva");
      return;
    }

    const saved = await postQcEvent({
      inspection: quantityEvent.inspection,
      eventType: quantityEvent.eventType,
      quantity,
      reason: quantityEventForm.reason.trim() || null,
    });

    if (saved) {
      setQuantityEvent(null);
      setQuantityEventForm(EMPTY_QUANTITY_EVENT_FORM);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Control de Calidad
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Verificación final antes del empaque y despacho.
        </p>
      </div>

      {/* Card principal */}
      <div className="rounded-3xl border-2 border-teal-200 bg-teal-50 p-6 dark:border-teal-800 dark:bg-teal-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-teal-100 p-3 dark:bg-teal-900/50">
            <ShieldCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-teal-900 dark:text-teal-100 mb-2">
              Ningún producto debe salir a empaque o despacho sin haber pasado por Control de Calidad
            </h3>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
              Aquí se validará: funcionamiento NFC, QR, impresión, personalización, materiales y estado físico.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Calidad
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Aprobados
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.approved}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Rechazados
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.rejected}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Reproceso
            </span>
          </div>
          <p className="text-2xl font-black">{metrics.rework}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Inspecciones QC
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear QC
            </button>
            <button
              type="button"
              onClick={() => loadQcInspections({ silent: true })}
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
        ) : qcInspections.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <ClipboardCheck className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay inspecciones QC registradas
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Las inspecciones creadas desde esta seccion apareceran aqui con trazabilidad por eventos.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Produccion</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Inspeccionado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Aprobado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Fallado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creada</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizada</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qcInspections.map((inspection) => {
                  const status = QC_STATUS_CONFIG[inspection.status] || {
                    label: inspection.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };
                  const actions = QC_ACTIONS_BY_STATUS[inspection.status] || [];

                  return (
                    <tr key={inspection.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div>
                          <span className="font-mono text-xs font-black text-primary">{inspection.code}</span>
                          {inspection.notes && (
                            <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{inspection.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {inspection.productionOrder ? (
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900">{inspection.productionOrder.code}</p>
                            <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">
                              {inspection.productionOrder.title}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sin orden vinculada</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{inspection.inspectionType}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">
                        {inspection.inspectedQuantity}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-emerald-700">
                        {inspection.passedQuantity}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-red-700">
                        {inspection.failedQuantity}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(inspection.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(inspection.updatedAt)}</td>
                      <td className="px-4 py-4">
                        {actions.length === 0 ? (
                          <p className="text-right text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Sin acciones
                          </p>
                        ) : (
                          <div className="flex min-w-[220px] flex-wrap justify-end gap-2">
                            {actions.map((action) => {
                              const eventKey = `${inspection.id}:${action.eventType}`;
                              const savingAction = savingEventKey === eventKey;

                              return (
                                <button
                                  key={action.eventType}
                                  type="button"
                                  onClick={() => handleQcAction(inspection, action.eventType)}
                                  disabled={Boolean(savingEventKey)}
                                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                                >
                                  {savingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                                  {action.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tipos de validación */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Tipos de Validación
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VALIDATION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.key}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${type.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {type.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500 mb-2">
                  {type.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist futuro */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Checklist de Calidad
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Resultados posibles */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Resultados Posibles
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {RESULTS.map((result) => {
            const Icon = result.icon;
            return (
              <div
                key={result.label}
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 opacity-60"
              >
                <div className={`rounded-xl p-2 mb-3 inline-flex ${result.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {result.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card final */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          ¿Por qué existe Control de Calidad?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.label} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                  {benefit.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateInspection} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Control de calidad</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear inspeccion QC</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra una inspeccion base. Los resultados se agregaran luego como eventos inmutables.
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
                    placeholder="QC-PT-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                  <input
                    value={form.inspectionType}
                    onChange={(event) => updateForm("inspectionType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="standard"
                  />
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
                  <p className="text-[11px] font-semibold text-slate-500">
                    Se muestran primero las ordenes completed o started cuando existen.
                  </p>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de calidad"
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
                  Guardar QC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quantityEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleQuantityEventSubmit} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Evento inmutable</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    {quantityEvent.eventType === "PASSED" ? "Aprobar cantidad" : "Rechazar cantidad"}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {quantityEvent.inspection.code} · {quantityEvent.inspection.inspectionType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeQuantityEventModal}
                  disabled={Boolean(savingEventKey)}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                quantityEvent.eventType === "PASSED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}>
                Este evento actualiza las cantidades acumuladas de QC. Los eventos no se editan ni se borran.
              </div>

              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={quantityEventForm.quantity}
                    onChange={(event) => updateQuantityEventForm("quantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Razon</span>
                  <input
                    value={quantityEventForm.reason}
                    onChange={(event) => updateQuantityEventForm("reason", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder={quantityEvent.eventType === "PASSED" ? "Lote aprobado por muestra" : "Defecto visual, NFC o QR"}
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeQuantityEventModal}
                  disabled={Boolean(savingEventKey)}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={Boolean(savingEventKey)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {savingEventKey === `${quantityEvent.inspection.id}:${quantityEvent.eventType}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  Guardar evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
