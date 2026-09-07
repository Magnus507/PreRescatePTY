"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Eye, Loader2, Plus, RefreshCw, Store, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type FinishedGood = {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
};

type StockRow = {
  productCode: string;
  productName: string;
  productType: string;
  storeProductId: string | null;
  storeVisible: boolean;
  availableCount: number;
  reservedCount: number;
  qaPendingCount: number;
  qaFailedCount: number;
  dispatchedCount: number;
  deliveredCount: number;
  activatedCount: number;
  totalUnits: number;
};

type InventoryUnit = {
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
  qrUrl: string | null;
  nfcUrl: string | null;
  activationCodeLast4: string | null;
};

type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  operationalMappingMeta?: {
    finishedGoodId?: string | null;
    productCode?: string | null;
    isPublished?: boolean;
  } | null;
};

function getStoreProduct(products: StoreProduct[], item: FinishedGood) {
  return products.find((product) => product.operationalMappingMeta?.finishedGoodId === item.id)
    || products.find((product) => product.operationalMappingMeta?.productCode === item.code)
    || products.find((product) => product.description?.includes(`[operationsProductCode:${item.code}]`))
    || null;
}

function inventoryStatusLabel(status: string) {
  const labels: Record<string, string> = {
    assembled: "En preparación",
    available: "Disponible",
    reserved: "Reservada",
    qa_pending: "QC pendiente",
    qa_failed: "QC rechazado",
  };
  return labels[status] || status;
}

export default function DirectInventorySection() {
  const [products, setProducts] = useState<FinishedGood[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", productType: "", unit: "unit" });
  const [saving, setSaving] = useState(false);
  const [unitsProduct, setUnitsProduct] = useState<FinishedGood | null>(null);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (value: string | null | undefined, label: string) => {
    if (!value) return toast.error(`${label} no disponible`);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No se pudo copiar ${label}`);
    }
  }, []);

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [fgRes, stockRes, storeRes] = await Promise.all([
        fetch(`/api/admin/operations/finished-goods?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/inventory/stock?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/products?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [fgData, stockData, storeData] = await Promise.all([
        fgRes.json(),
        stockRes.json(),
        storeRes.json(),
      ]);
      if (!fgRes.ok) throw new Error(fgData.error || "No se pudo cargar Productos base");
      if (!stockRes.ok) throw new Error(stockData.error || "No se pudo cargar inventario");
      setProducts(Array.isArray(fgData.finishedGoods) ? fgData.finishedGoods : []);
      setStock(Array.isArray(stockData.stock) ? stockData.stock : []);
      setStoreProducts(Array.isArray(storeData.products) ? storeData.products : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar inventario");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stockByCode = useMemo(
    () => new Map(stock.map((row) => [row.productCode, row])),
    [stock]
  );

  const loadUnits = async (product: FinishedGood) => {
    setUnitsProduct(product);
    setSelectedUnitId(null);
    setUnitsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/operations/inventory/units?productCode=${encodeURIComponent(product.code)}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las unidades");
      const nextUnits = Array.isArray(data.units) ? data.units : [];
      setUnits(nextUnits);
      if (nextUnits[0]?.id) setSelectedUnitId(nextUnits[0].id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar unidades");
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/finished-goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          productType: form.productType.trim(),
          unit: form.unit.trim() || "unit",
          notes: null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear Producto base");
      toast.success("Producto base creado");
      setShowCreate(false);
      setForm({ code: "", name: "", productType: "", unit: "unit" });
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear producto");
    } finally {
      setSaving(false);
    }
  };

  const publishProduct = async (item: FinishedGood) => {
    const existing = getStoreProduct(storeProducts, item);
    const value = window.prompt("Precio de venta", existing?.price ? String(existing.price) : "");
    if (value === null) return;
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) return toast.error("Precio inválido");

    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", price }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo publicar");
      toast.success("Publicado en Tienda");
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al publicar");
    } finally {
      setPublishingId(null);
    }
  };

  const unpublishProduct = async (item: FinishedGood) => {
    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo ocultar");
      toast.success("Oculto de Tienda");
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al ocultar");
    } finally {
      setPublishingId(null);
    }
  };

  const canDiscard = (unit: InventoryUnit) =>
    !unit.reservedOrderId
    && !unit.dispatchId
    && unit.activationStatus !== "activated"
    && !["reserved", "dispatched", "delivered", "activated"].includes(unit.inventoryStatus);

  const discardUnit = async (unit: InventoryUnit) => {
    if (!window.confirm(`Descartar ${unit.internalLabel}?`)) return;
    setDiscardingId(unit.id);
    try {
      const res = await fetch(`/api/admin/operations/inventory/units/${unit.id}/discard`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo descartar");
      toast.success("Unidad descartada");
      if (unitsProduct) await loadUnits(unitsProduct);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al descartar");
    } finally {
      setDiscardingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Inventario activo</h3>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Aquí quedan solo las unidades que todavía requieren trabajo. Lo despachado o entregado se conserva en Despachos e Historial.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white"
          >
            <Plus className="h-4 w-4" /> Crear producto
          </button>
          <button
            type="button"
            onClick={() => loadData({ silent: true })}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                {['Producto', 'Disponible', 'Reservado', 'QC', 'Tienda'].map((label) => (
                  <th key={label} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((item) => {
                const row = stockByCode.get(item.code);
                const storeProduct = getStoreProduct(storeProducts, item);
                const published = Boolean(storeProduct?.isActive && (storeProduct.operationalMappingMeta?.isPublished ?? true));
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/70">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900 dark:text-white">{item.name}</p>
                      <p className="mt-1 font-mono text-[10px] font-bold text-primary">{item.code}</p>
                    </td>
                    <td className="px-4 py-4 text-lg font-black text-emerald-700">{row?.availableCount || 0}</td>
                    <td className="px-4 py-4 text-lg font-black text-blue-700">{row?.reservedCount || 0}</td>
                    <td className="px-4 py-4 text-sm font-black text-slate-700 dark:text-slate-300">
                      {row?.qaPendingCount || 0}
                      {row?.qaFailedCount ? <span className="ml-2 text-red-600">· {row.qaFailedCount} rechaz.</span> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${published ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                        {published ? "Publicado" : "Oculto"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => loadUnits(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          <Eye className="h-3.5 w-3.5" /> Unidades
                        </button>
                        {published ? (
                          <button
                            type="button"
                            onClick={() => unpublishProduct(item)}
                            disabled={publishingId === item.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            Ocultar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => publishProduct(item)}
                            disabled={publishingId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                          >
                            <Store className="h-3.5 w-3.5" /> Publicar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={createProduct} className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950 dark:text-white">Crear Producto base</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 p-2 text-slate-400 dark:border-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Código</span>
                <input required value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900" placeholder="PRP-FG-..." />
              </label>
              <label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                <input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                <input required value={form.productType} onChange={(e) => setForm((v) => ({ ...v, productType: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900" placeholder="sticker_prerescatepty" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {unitsProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">Unidades activas · {unitsProduct.name}</h3>
              <p className="font-mono text-[10px] font-bold text-primary">{unitsProduct.code}</p>
            </div>
            <button type="button" onClick={() => { setUnitsProduct(null); setUnits([]); setSelectedUnitId(null); }} className="rounded-xl border border-slate-200 p-2 text-slate-400 dark:border-slate-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-5">
            {unitsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : units.length === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-slate-400">Sin unidades activas. Las entregadas permanecen en Historial.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-2">
                  {units.map((unit) => {
                    const selected = selectedUnitId === unit.id;
                    return (
                      <button
                        type="button"
                        key={unit.id}
                        onClick={() => setSelectedUnitId(selected ? null : unit.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-700 dark:bg-slate-900"}`}
                      >
                        <p className="font-mono text-sm font-black text-slate-900 dark:text-white">{unit.internalLabel}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {inventoryStatusLabel(unit.inventoryStatus)} · QC {unit.qaStatus || "—"}{unit.reservedOrderId ? " · vinculada a pedido" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const unit = units.find((item) => item.id === selectedUnitId) || units[0];
                  if (!unit) return null;
                  const publicRows = [
                    { label: "ShortCode público", value: unit.shortCode },
                    { label: "NFC público", value: unit.nfcUrl },
                    { label: "QR público", value: unit.qrUrl },
                  ];
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad</p>
                          <h4 className="mt-1 font-mono text-base font-black text-slate-950 dark:text-white">{unit.internalLabel}</h4>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{inventoryStatusLabel(unit.inventoryStatus)}</p>
                        </div>
                        {canDiscard(unit) && (
                          <button type="button" onClick={() => discardUnit(unit)} disabled={discardingId === unit.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" /> {discardingId === unit.id ? "Descartando" : "Descartar"}
                          </button>
                        )}
                      </div>
                      <div className="mt-4 grid gap-2">
                        {publicRows.map((row) => (
                          <button key={row.label} type="button" onClick={() => copyToClipboard(row.value, row.label)} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800">
                            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">{row.label}</span>
                            <span className="mt-1 block break-all font-mono text-xs font-black text-slate-900 dark:text-white">{row.value || "Pendiente"}</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] font-semibold leading-relaxed text-slate-400">
                        Por seguridad, Inventario no revela el código secreto ni ofrece un enlace administrativo de activación.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
