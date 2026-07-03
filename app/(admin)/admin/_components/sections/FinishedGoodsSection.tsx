"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Edit3,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

const FLOW = [
  "Producción",
  "QC",
  "Empaque",
  "Inventario terminado",
  "Venta",
  "Salida",
];

const FUTURE_ACTIONS = [
  { label: "Revisar salida comercial", hint: "Gestionar desde Centro de Operaciones" },
];

const FINISHED_GOOD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  inactive: { label: "Inactivo", color: "bg-slate-50 border-slate-200 text-slate-700" },
  reserved: { label: "Reservado", color: "bg-amber-50 border-amber-200 text-amber-800" },
};

interface PackingBatchOption {
  id: string;
  code: string;
  status: string;
  packageType: string;
  plannedQuantity: number;
  packedQuantity: number;
  rejectedQuantity: number;
  labelCode: string | null;
}

interface FinishedGood {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
  packingBatchId: string | null;
  notes: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
  packingBatch: PackingBatchOption | null;
}

interface InventoryUnitDetail {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  productCode: string;
  productName: string;
  qaStatus: string | null;
  inventoryStatus: string;
  activationStatus: string;
  reservedOrderId: string | null;
  dispatchId: string | null;
  productionOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

type InventoryUnitsFilter = "all" | "available" | "reserved" | "qa_pending" | "qa_failed" | "dispatched" | "activated";

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image: string | null;
  isActive: boolean;
  productType: string;
}

interface FinishedGoodFormState {
  code: string;
  name: string;
  productType: string;
  unit: string;
  packingBatchId: string;
  initialQuantity: string;
  notes: string;
}

interface FinishedGoodEditFormState {
  name: string;
  productType: string;
  unit: string;
  notes: string;
  status: string;
}

interface PublishFormState {
  price: string;
  description: string;
  category: string;
  imageUrl: string;
  visible: boolean;
}

type FinishedGoodEventType =
  | "RECEIPT"
  | "RESERVATION"
  | "RELEASE"
  | "ISSUE"
  | "ADJUSTMENT"
  | "RETURN";

interface MovementFormState {
  eventType: FinishedGoodEventType;
  quantity: string;
  reason: string;
  referenceType: string;
  referenceId: string;
  metadataJson: string;
}

const EMPTY_FINISHED_GOOD_FORM: FinishedGoodFormState = {
  code: "",
  name: "",
  productType: "",
  unit: "unit",
  packingBatchId: "",
  initialQuantity: "",
  notes: "",
};

const EMPTY_FINISHED_GOOD_EDIT_FORM: FinishedGoodEditFormState = {
  name: "",
  productType: "",
  unit: "unit",
  notes: "",
  status: "active",
};

const EMPTY_PUBLISH_FORM: PublishFormState = {
  price: "",
  description: "",
  category: "Accesorios",
  imageUrl: "",
  visible: true,
};

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  eventType: "RECEIPT",
  quantity: "",
  reason: "",
  referenceType: "",
  referenceId: "",
  metadataJson: "",
};

function extractOperationsProductCodeFromDescription(value: string | null) {
  if (!value) return null;
  const match = value.match(/\[operationsProductCode:([^\]]+)\]/);
  return match?.[1] || null;
}

const FINISHED_GOOD_EVENT_OPTIONS: Array<{ value: FinishedGoodEventType; label: string }> = [
  { value: "RECEIPT", label: "Entrada" },
  { value: "RESERVATION", label: "Reserva" },
  { value: "RELEASE", label: "Liberacion" },
  { value: "ISSUE", label: "Salida" },
  { value: "ADJUSTMENT", label: "Ajuste" },
  { value: "RETURN", label: "Retorno" },
];

export function FinishedGoodsSection() {
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [packingBatches, setPackingBatches] = useState<PackingBatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFinishedGood, setEditingFinishedGood] = useState<FinishedGood | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [form, setForm] = useState<FinishedGoodFormState>(EMPTY_FINISHED_GOOD_FORM);
  const [editForm, setEditForm] = useState<FinishedGoodEditFormState>(EMPTY_FINISHED_GOOD_EDIT_FORM);
  const [movementTarget, setMovementTarget] = useState<FinishedGood | null>(null);
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM);
  const [savingMovement, setSavingMovement] = useState(false);
  const [publishTarget, setPublishTarget] = useState<FinishedGood | null>(null);
  const [publishForm, setPublishForm] = useState<PublishFormState>(EMPTY_PUBLISH_FORM);
  const [unitsTarget, setUnitsTarget] = useState<FinishedGood | null>(null);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState("");
  const [unitsFilter, setUnitsFilter] = useState<InventoryUnitsFilter>("all");
  const [unitDetails, setUnitDetails] = useState<{
    summary: {
      total: number;
      available: number;
      reserved: number;
      qaPending: number;
      qaFailed: number;
      dispatched: number;
      delivered: number;
      activated: number;
    } | null;
    units: InventoryUnitDetail[];
  }>({ summary: null, units: [] });

  const loadFinishedGoods = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [finishedGoodsRes, storeProductsRes] = await Promise.all([
        fetch("/api/admin/operations/finished-goods", { cache: "no-store" }),
        fetch("/api/admin/products", { cache: "no-store" }),
      ]);
      const [data, storeData] = await Promise.all([finishedGoodsRes.json(), storeProductsRes.json()]);

      if (!finishedGoodsRes.ok) {
        throw new Error(data.error || "No se pudo cargar productos base");
      }

      setFinishedGoods(Array.isArray(data.finishedGoods) ? data.finishedGoods : []);
      setStoreProducts(Array.isArray(storeData.products) ? storeData.products : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar productos base";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadPackingBatches = useCallback(async () => {
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
    }
  }, []);

  const loadUnitDetails = useCallback(async (item: FinishedGood) => {
    setUnitsTarget(item);
    setUnitsLoading(true);
    setUnitsError("");
    setUnitsFilter("all");
    try {
      const res = await fetch(`/api/admin/operations/inventory/units?productCode=${encodeURIComponent(item.code)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar las unidades");
      }
      setUnitDetails({
        summary: data.summary || null,
        units: Array.isArray(data.units) ? data.units : [],
      });
    } catch (error) {
      setUnitsError(error instanceof Error ? error.message : "Error al cargar las unidades");
      setUnitDetails({ summary: null, units: [] });
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinishedGoods();
    loadPackingBatches();
  }, [loadFinishedGoods, loadPackingBatches]);

  const metrics = useMemo(() => {
    return finishedGoods.reduce(
      (acc, item) => {
        acc.skus += 1;
        acc.available += item.balance;
        if (item.status === "active") {
          acc.active += 1;
        }

        if (item.packingBatch) {
          acc.fromPacking += 1;
        }

        return acc;
      },
      { skus: 0, available: 0, active: 0, fromPacking: 0 }
    );
  }, [finishedGoods]);

  const selectablePackingBatches = useMemo(() => {
    return [...packingBatches]
      .filter((batch) => batch.status !== "cancelled")
      .sort((a, b) => {
        const aCompleted = a.status === "completed" ? 0 : 1;
        const bCompleted = b.status === "completed" ? 0 : 1;
        return aCompleted - bCompleted || a.code.localeCompare(b.code);
      });
  }, [packingBatches]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat("es-PA", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const updateForm = (field: keyof FinishedGoodFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEditForm = (field: keyof FinishedGoodEditFormState, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_FINISHED_GOOD_FORM);
  };

  const openEditModal = (item: FinishedGood) => {
    setEditingFinishedGood(item);
    setEditForm({
      name: item.name,
      productType: item.productType,
      unit: item.unit,
      notes: item.notes || "",
      status: item.status || "active",
    });
  };

  const openPublishModal = (item: FinishedGood) => {
    const existing = storeProducts.find((product) => extractOperationsProductCodeFromDescription(product.description) === item.code);
    setPublishTarget(item);
    setPublishForm({
      price: existing ? String(existing.price) : "",
      description: existing?.description?.replace(/\n\[operationsProductCode:[^\]]+\]/g, "").trim() || "",
      category: existing?.category || "Accesorios",
      imageUrl: existing?.image || "",
      visible: existing ? existing.isActive : true,
    });
  };

  const closePublishModal = () => {
    if (publishingId) return;
    setPublishTarget(null);
    setPublishForm(EMPTY_PUBLISH_FORM);
  };

  const closeUnitsModal = () => {
    if (unitsLoading) return;
    setUnitsTarget(null);
    setUnitsError("");
    setUnitsFilter("all");
    setUnitDetails({ summary: null, units: [] });
  };

  const publishToStore = async (item: FinishedGood) => {
    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          price: publishForm.price === "" ? undefined : Number(publishForm.price),
          description: publishForm.description.trim() || undefined,
          category: publishForm.category.trim() || undefined,
          visible: publishForm.visible,
          imageUrl: publishForm.imageUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo publicar en Tienda");
      toast.success(data.message || "Producto publicado en catálogo comercial");
      await loadFinishedGoods({ silent: true });
      setPublishTarget(null);
      setPublishForm(EMPTY_PUBLISH_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al publicar en Tienda");
    } finally {
      setPublishingId(null);
    }
  };

  const unpublishFromStore = async (item: FinishedGood) => {
    if (!confirm("El producto dejará de verse en la tienda del cliente. No se borra inventario.")) return;
    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo despublicar");
      toast.success(data.message || "Producto despublicado");
      await loadFinishedGoods({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al despublicar");
    } finally {
      setPublishingId(null);
    }
  };

  const getPublishedStoreProduct = (item: FinishedGood) => {
    return storeProducts.find((product) => extractOperationsProductCodeFromDescription(product.description) === item.code) || null;
  };

  const filteredUnits = unitDetails.units.filter((unit) => {
    switch (unitsFilter) {
      case "available":
        return unit.inventoryStatus === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId;
      case "reserved":
        return unit.inventoryStatus === "reserved" || Boolean(unit.reservedOrderId);
      case "qa_pending":
        return unit.inventoryStatus === "qa_pending" || unit.qaStatus === "pending";
      case "qa_failed":
        return unit.inventoryStatus === "qa_failed" || unit.qaStatus === "failed";
      case "dispatched":
        return unit.inventoryStatus === "dispatched";
      case "activated":
        return unit.activationStatus === "activated";
      default:
        return true;
    }
  });

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingFinishedGood(null);
    setEditForm(EMPTY_FINISHED_GOOD_EDIT_FORM);
  };

  const openMovementModal = (item: FinishedGood) => {
    setMovementTarget(item);
    setMovementForm({
      ...EMPTY_MOVEMENT_FORM,
      quantity: item.balance > 0 ? String(item.balance) : "",
    });
  };

  const closeMovementModal = () => {
    if (savingMovement) return;
    setMovementTarget(null);
    setMovementForm(EMPTY_MOVEMENT_FORM);
  };

  const updateMovementForm = (field: keyof MovementFormState, value: string) => {
    setMovementForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateFinishedGood = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const name = form.name.trim();
    const productType = form.productType.trim();
    const unit = form.unit.trim() || "unit";
    const initialQuantity = form.initialQuantity.trim() ? Number(form.initialQuantity) : undefined;

    if (!code) {
      toast.error("Code es requerido");
      return;
    }

    if (!name) {
      toast.error("Name es requerido");
      return;
    }

    if (!productType) {
      toast.error("productType es requerido");
      return;
    }

    if (initialQuantity !== undefined && (!Number.isFinite(initialQuantity) || initialQuantity <= 0)) {
      toast.error("initialQuantity debe ser positivo");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/finished-goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          productType,
          unit,
          packingBatchId: form.packingBatchId || null,
          initialQuantity,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe un producto terminado con ese code");
        }
        throw new Error(data.error || "No se pudo crear producto terminado");
      }

      toast.success("Producto terminado creado");
      setShowCreateModal(false);
      setForm(EMPTY_FINISHED_GOOD_FORM);
      await loadFinishedGoods({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear producto terminado";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!movementTarget) return;

    const quantity = Number(movementForm.quantity);

    if (!movementForm.eventType) {
      toast.error("eventType es requerido");
      return;
    }

    if (!Number.isFinite(quantity)) {
      toast.error("quantity debe ser numerico");
      return;
    }

    if (movementForm.eventType === "ADJUSTMENT") {
      if (quantity === 0) {
        toast.error("ADJUSTMENT requiere quantity distinto de 0");
        return;
      }
    } else if (quantity <= 0) {
      toast.error(`${movementForm.eventType} requiere quantity positivo`);
      return;
    }

    setSavingMovement(true);

    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${movementTarget.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: movementForm.eventType,
          quantity,
          reason: movementForm.reason.trim() || null,
          referenceType: movementForm.referenceType.trim() || null,
          referenceId: movementForm.referenceId.trim() || null,
          metadataJson: movementForm.metadataJson.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar movimiento PT");
      }

      toast.success("Movimiento PT registrado");
      setMovementTarget(null);
      setMovementForm(EMPTY_MOVEMENT_FORM);
      await loadFinishedGoods({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar movimiento PT";
      toast.error(message);
    } finally {
      setSavingMovement(false);
    }
  };

  const handleEditFinishedGood = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingFinishedGood) return;

    const name = editForm.name.trim();
    const productType = editForm.productType.trim();
    const unit = editForm.unit.trim() || "unit";

    if (!name) {
      toast.error("Name es requerido");
      return;
    }

    if (!productType) {
      toast.error("productType es requerido");
      return;
    }

    if (!unit) {
      toast.error("unit es requerido");
      return;
    }

    setSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${editingFinishedGood.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          productType,
          unit,
          notes: editForm.notes.trim() || null,
          status: editForm.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar producto terminado");
      }

      toast.success("Producto terminado actualizado");
      setEditingFinishedGood(null);
      setEditForm(EMPTY_FINISHED_GOOD_EDIT_FORM);
      await loadFinishedGoods({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al actualizar producto terminado";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Producto vendible
            </div>
            <h3 className="text-2xl font-black tracking-tight text-emerald-950">Productos base</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-800">
              Catálogo operativo de productos terminados que pueden producirse, reservarse o venderse.
              Crear un producto base no crea unidades disponibles.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            Balance calculado por eventos
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-slate-500">Ruta de entrada a inventario agregado</h3>
        <div className="flex overflow-x-auto pb-2">
          {FLOW.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="min-w-[150px] rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                <p className="mt-2 text-sm font-black text-slate-800">{step}</p>
              </div>
              {index < FLOW.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-300" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Warehouse className="mb-4 h-6 w-6 text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Productos</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.skus}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PackageCheck className="mb-4 h-6 w-6 text-emerald-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponible</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatQuantity(metrics.available)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Factory className="mb-4 h-6 w-6 text-blue-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reservado / Despachado</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.fromPacking}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Boxes className="mb-4 h-6 w-6 text-amber-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Activados</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.active}</p>
        </article>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-slate-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Productos base
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear producto
            </button>
            <button
              type="button"
              onClick={() => loadFinishedGoods({ silent: true })}
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
        ) : finishedGoods.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Warehouse className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay productos base configurados
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              El catálogo operativo se mostrará aquí cuando exista.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Empaque</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finishedGoods.map((item) => {
                  const status = FINISHED_GOOD_STATUS_CONFIG[item.status] || {
                    label: item.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-primary">{item.code}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-slate-900">{item.name}</p>
                        {item.notes && (
                          <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.productType}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.unit}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-emerald-700">
                        {formatQuantity(item.balance)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="mb-2 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Disp {formatQuantity(item.balance)}</span>
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">PT {item.unit}</span>
                        </div>
                        {item.packingBatch ? (
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900">{item.packingBatch.code}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {item.packingBatch.status} · {item.packingBatch.packageType}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sin empaque</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(item.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void loadUnitDetails(item)}
                          disabled={unitsLoading || savingEdit || savingMovement}
                          className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Warehouse className="h-4 w-4" />
                          Ver unidades
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={savingEdit || savingMovement}
                          className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </button>
                        <div className="mt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openMovementModal(item)}
                            disabled={savingMovement || savingEdit}
                            className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PackageCheck className="h-4 w-4" />
                            Registrar movimiento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const published = getPublishedStoreProduct(item);
                              if (published?.isActive) {
                                void unpublishFromStore(item);
                                return;
                              }
                              openPublishModal(item);
                            }}
                            disabled={publishingId === item.id || savingMovement || savingEdit}
                            className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {publishingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                            {getPublishedStoreProduct(item)?.isActive ? "Dejar de publicar" : "Publicar en Tienda"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Rutas complementarias</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE_ACTIONS.map((action) => (
            <button key={action.label} type="button" disabled className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left opacity-60">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                <Store className="h-4 w-4" />
                {action.label}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{action.hint}</p>
            </button>
          ))}
        </div>
      </section>

      {unitsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Inventario real</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {unitsTarget.code} · {unitsTarget.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Detalle de unidades físicas por internalLabel.</p>
              </div>
              <button
                type="button"
                onClick={closeUnitsModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              {unitsLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando unidades...
                </div>
              ) : unitsError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{unitsError}</div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["total", "Total"],
                      ["available", "Disponibles"],
                      ["reserved", "Reservadas"],
                      ["qaPending", "Pendiente QC"],
                      ["qaFailed", "QC fallido"],
                      ["dispatched", "Despachadas"],
                      ["delivered", "Entregadas"],
                      ["activated", "Activadas"],
                    ].map(([key, label]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">
                          {formatQuantity((unitDetails.summary?.[key as keyof NonNullable<typeof unitDetails.summary>] as number) || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      ["all", "Todas"],
                      ["available", "Disponibles"],
                      ["reserved", "Reservadas"],
                      ["qa_pending", "Pendiente QC"],
                      ["qa_failed", "Fallidas QC"],
                      ["dispatched", "Despachadas"],
                      ["activated", "Activadas"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setUnitsFilter(key as InventoryUnitsFilter)}
                        className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                          unitsFilter === key
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Etiqueta</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Short code</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">QC</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Inventario</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Activación</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Despacho</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUnits.map((unit) => (
                          <tr key={unit.id}>
                            <td className="px-4 py-3 font-mono text-xs font-black text-primary">{unit.internalLabel}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{unit.shortCode || "Sin shortCode"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{unit.qaStatus || "n/a"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{unit.inventoryStatus}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{unit.activationStatus}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{unit.reservedOrderId || "—"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{unit.dispatchId || "—"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(unit.updatedAt)}</td>
                          </tr>
                        ))}
                        {filteredUnits.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                              No hay unidades para este filtro.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateFinishedGood} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Productos base</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear producto base</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra un producto de catálogo. No crea unidades disponibles.
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
                    placeholder="PT-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Sticker NFC listo para venta"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de producto</span>
                  <input
                    required
                    value={form.productType}
                    onChange={(event) => updateForm("productType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="sticker_nfc_qr"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</span>
                  <input
                    value={form.unit}
                    onChange={(event) => updateForm("unit", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="unit"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad inicial</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.initialQuantity}
                    onChange={(event) => updateForm("initialQuantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Empaque</span>
                  <select
                    value={form.packingBatchId}
                    onChange={(event) => updateForm("packingBatchId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Sin empaque vinculado</option>
                    {selectablePackingBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code} · {batch.status} · {batch.packageType} · {batch.packedQuantity} empacados
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Se muestran primero batches completed; cancelled queda fuera del selector.
                  </p>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de producto terminado"
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
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingFinishedGood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleEditFinishedGood} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Productos base</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Editar producto base</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {editingFinishedGood.code} · balance actual {formatQuantity(editingFinishedGood.balance)} {editingFinishedGood.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input
                    required
                    value={editForm.name}
                    onChange={(event) => updateEditForm("name", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de producto</span>
                  <input
                    required
                    value={editForm.productType}
                    onChange={(event) => updateEditForm("productType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</span>
                  <input
                    required
                    value={editForm.unit}
                    onChange={(event) => updateEditForm("unit", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</span>
                  <select
                    value={editForm.status}
                    onChange={(event) => updateEditForm("status", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="active">Activo</option>
                    <option value="reserved">Reservado</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={editForm.notes}
                    onChange={(event) => updateEditForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateMovement} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Movimiento PT</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar movimiento</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {movementTarget.code} · balance actual {formatQuantity(movementTarget.balance)} {movementTarget.unit}
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de evento</span>
                  <select
                    required
                    value={movementForm.eventType}
                    onChange={(event) => updateMovementForm("eventType", event.target.value as FinishedGoodEventType)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {FINISHED_GOOD_EVENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} · {option.value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={movementForm.quantity}
                    onChange={(event) => updateMovementForm("quantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder={movementForm.eventType === "ADJUSTMENT" ? "-5 o 10" : "10"}
                  />
                  <p className="text-[11px] font-semibold text-slate-500">
                    ADJUSTMENT permite negativos; los demas movimientos requieren cantidad positiva.
                  </p>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo</span>
                  <textarea
                    value={movementForm.reason}
                    onChange={(event) => updateMovementForm("reason", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Ingreso, reserva, liberacion, salida, ajuste o retorno operativo"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reference type</span>
                  <input
                    value={movementForm.referenceType}
                    onChange={(event) => updateMovementForm("referenceType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="order, dispatch, adjustment"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reference ID</span>
                  <input
                    value={movementForm.referenceId}
                    onChange={(event) => updateMovementForm("referenceId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Pedido, despacho o documento"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metadata JSON</span>
                  <textarea
                    value={movementForm.metadataJson}
                    onChange={(event) => updateMovementForm("metadataJson", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder='{"ubicacion":"bodega-pt"}'
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
                  {savingMovement ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void publishToStore(publishTarget);
              }}
              className="space-y-6 p-6 md:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Publicar en tienda</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{publishTarget.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Define precio, descripción, categoría, visibilidad e imagen comercial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePublishModal}
                  disabled={publishingId === publishTarget.id}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Precio</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={publishForm.price}
                    onChange={(event) => setPublishForm((current) => ({ ...current, price: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría</span>
                  <input
                    value={publishForm.category}
                    onChange={(event) => setPublishForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Accesorios"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descripción comercial</span>
                  <textarea
                    value={publishForm.description}
                    onChange={(event) => setPublishForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Texto comercial visible para cliente"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagen</span>
                  <input
                    value={publishForm.imageUrl}
                    onChange={(event) => setPublishForm((current) => ({ ...current, imageUrl: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="https://..."
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={publishForm.visible}
                    onChange={(event) => setPublishForm((current) => ({ ...current, visible: event.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Visible para cliente
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePublishModal}
                  disabled={publishingId === publishTarget.id}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publishingId === publishTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {publishingId === publishTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
