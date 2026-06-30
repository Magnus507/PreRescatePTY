"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ClipboardList,
  Factory,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Truck,
  X,
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

interface MaterialFormState {
  code: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  supplierName: string;
  notes: string;
}

type MaterialEventType = "RECEIPT" | "ISSUE" | "ADJUSTMENT" | "RESERVATION" | "RELEASE";

interface MovementFormState {
  eventType: MaterialEventType;
  quantity: string;
  reason: string;
  referenceType: string;
  referenceId: string;
  metadataJson: string;
}

const EMPTY_FORM: MaterialFormState = {
  code: "",
  name: "",
  category: "",
  unit: "",
  description: "",
  supplierName: "",
  notes: "",
};

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  eventType: "RECEIPT",
  quantity: "",
  reason: "",
  referenceType: "",
  referenceId: "",
  metadataJson: "",
};

const MATERIAL_EVENT_TYPES: Array<{ value: MaterialEventType; label: string }> = [
  { value: "RECEIPT", label: "Ingreso" },
  { value: "ISSUE", label: "Salida" },
  { value: "ADJUSTMENT", label: "Ajuste" },
  { value: "RESERVATION", label: "Reserva" },
  { value: "RELEASE", label: "Liberacion" },
];

const MATERIAL_TASKS = [
  { label: "Recibir materiales", detail: "Registrar entrada fisica desde proveedor.", icon: PackagePlus },
  { label: "Asignar ubicacion", detail: "Bodega, estante, caja o mesa de trabajo.", icon: MapPin },
  { label: "Registrar proveedor", detail: "Proveedor, contacto y condicion de compra.", icon: Truck },
  { label: "Registrar cantidad", detail: "Unidades, paquetes o rollos recibidos.", icon: Scale },
  { label: "Registrar lote/factura", detail: "Factura, lote proveedor y evidencia.", icon: ReceiptText },
  { label: "Ver balance bajo", detail: "Alertas para reposicion de materiales.", icon: AlertTriangle },
];

export function MaterialsWorkflowSection() {
  const [materials, setMaterials] = useState<OperationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [movementMaterial, setMovementMaterial] = useState<OperationMaterial | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [form, setForm] = useState<MaterialFormState>(EMPTY_FORM);
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM);

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

  const metrics = useMemo(() => {
    const categories = new Set(materials.map((material) => material.category).filter(Boolean));
    return materials.reduce(
      (acc, material) => {
        acc.total += 1;
        acc.balance += material.balance;
        if (material.status === "active") acc.active += 1;
        return acc;
      },
      { total: 0, active: 0, balance: 0, categories: categories.size }
    );
  }, [materials]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const updateForm = (field: keyof MaterialFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateMovementForm = (field: keyof MovementFormState, value: string) => {
    setMovementForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_FORM);
  };

  const openMovementModal = (material: OperationMaterial) => {
    setMovementMaterial(material);
    setMovementForm(EMPTY_MOVEMENT_FORM);
  };

  const closeMovementModal = () => {
    if (savingMovement) return;
    setMovementMaterial(null);
    setMovementForm(EMPTY_MOVEMENT_FORM);
  };

  const handleCreateMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          category: form.category.trim(),
          unit: form.unit.trim(),
          description: form.description.trim() || null,
          supplierName: form.supplierName.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el material");
      }

      toast.success("Material creado");
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      await loadMaterials({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear material";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!movementMaterial) return;

    const quantity = Number(movementForm.quantity);
    if (!Number.isFinite(quantity)) {
      toast.error("La cantidad debe ser numerica");
      return;
    }

    if (movementForm.eventType === "ADJUSTMENT") {
      if (quantity === 0) {
        toast.error("El ajuste no puede ser 0");
        return;
      }
    } else if (quantity <= 0) {
      toast.error("La cantidad debe ser positiva");
      return;
    }

    setSavingMovement(true);

    try {
      const res = await fetch(`/api/admin/operations/materials/${movementMaterial.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: movementForm.eventType,
          quantity,
          unit: movementMaterial.unit,
          reason: movementForm.reason.trim() || null,
          referenceType: movementForm.referenceType.trim() || null,
          referenceId: movementForm.referenceId.trim() || null,
          metadataJson: movementForm.metadataJson.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el movimiento");
      }

      toast.success("Movimiento registrado");
      setMovementMaterial(null);
      setMovementForm(EMPTY_MOVEMENT_FORM);
      await loadMaterials({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar movimiento";
      toast.error(message);
    } finally {
      setSavingMovement(false);
    }
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Materiales", value: metrics.total, icon: Archive, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Activos", value: metrics.active, icon: Factory, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Balance agregado", value: metrics.balance, icon: Scale, tone: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Categorias", value: metrics.categories, icon: ClipboardList, tone: "bg-amber-50 text-amber-700 border-amber-200" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
              </div>
              <div className={`rounded-xl border p-2 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Materiales registrados</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear material
            </button>
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
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Accion</th>
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
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openMovementModal(material)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-primary/30 hover:text-primary"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Registrar movimiento
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateMaterial} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Materiales</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear material</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra un insumo fisico para produccion. Las cantidades se moveran por eventos de inventario operativo.
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
                    placeholder="MAT-STICKER-NFC"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Sticker NFC en blanco"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria</span>
                  <input
                    required
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="stickers"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</span>
                  <input
                    required
                    value={form.unit}
                    onChange={(event) => updateForm("unit", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="unidad"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proveedor</span>
                  <input
                    value={form.supplierName}
                    onChange={(event) => updateForm("supplierName", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Nombre del proveedor"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descripcion</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Uso, especificacion o detalle del material"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas"
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
                  Guardar material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateMovement} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Movimiento inmutable</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar movimiento</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {movementMaterial.code} · {movementMaterial.name} · unidad {movementMaterial.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMovementModal}
                  disabled={savingMovement}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                Los movimientos no se editan ni se borran. El balance se recalcula desde eventos y se refresca despues de guardar.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                  <select
                    required
                    value={movementForm.eventType}
                    onChange={(event) => updateMovementForm("eventType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {MATERIAL_EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
                  <input
                    required
                    type="number"
                    step="any"
                    value={movementForm.quantity}
                    onChange={(event) => updateMovementForm("quantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder={movementForm.eventType === "ADJUSTMENT" ? "-5 o 10" : "10"}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Razon</span>
                  <input
                    value={movementForm.reason}
                    onChange={(event) => updateMovementForm("reason", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Compra, consumo de produccion, reserva o ajuste operativo"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia tipo</span>
                  <input
                    value={movementForm.referenceType}
                    onChange={(event) => updateMovementForm("referenceType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="invoice, order, production"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia ID</span>
                  <input
                    value={movementForm.referenceId}
                    onChange={(event) => updateMovementForm("referenceId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Factura, orden o lote"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metadata JSON</span>
                  <textarea
                    value={movementForm.metadataJson}
                    onChange={(event) => updateMovementForm("metadataJson", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder='{"ubicacion":"bodega-1"}'
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeMovementModal}
                  disabled={savingMovement}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {savingMovement ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
