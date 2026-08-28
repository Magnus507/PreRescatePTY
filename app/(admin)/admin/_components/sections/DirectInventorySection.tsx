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
};

type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  operationalMappingMeta?: { finishedGoodId?: string | null; productCode?: string | null; isPublished?: boolean } | null;
};

function getStoreProduct(products: StoreProduct[], item: FinishedGood) {
  return products.find((product) => product.operationalMappingMeta?.finishedGoodId === item.id)
    || products.find((product) => product.operationalMappingMeta?.productCode === item.code)
    || products.find((product) => product.description?.includes(`[operationsProductCode:${item.code}]`))
    || null;
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

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [fgRes, stockRes, storeRes] = await Promise.all([
        fetch(`/api/admin/operations/finished-goods?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/inventory/stock?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/products?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [fgData, stockData, storeData] = await Promise.all([fgRes.json(), stockRes.json(), storeRes.json()]);
      if (!fgRes.ok) throw new Error(fgData.error || "No se pudo cargar Productos base");
      if (!stockRes.ok) throw new Error(stockData.error || "No se pudo cargar inventario");
      setProducts(Array.isArray(fgData.finishedGoods) ? fgData.finishedGoods : []);
      setStock(Array.isArray(stockData.stock) ? stockData.stock : []);
      setStoreProducts(Array.isArray(storeData.products) ? storeData.products : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar inventario");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const stockByCode = useMemo(() => new Map(stock.map((row) => [row.productCode, row])), [stock]);

  const loadUnits = async (product: FinishedGood) => {
    setUnitsProduct(product); setUnitsLoading(true);
    try {
      const res = await fetch(`/api/admin/operations/inventory/units?productCode=${encodeURIComponent(product.code)}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las unidades");
      setUnits(Array.isArray(data.units) ? data.units : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar unidades");
      setUnits([]);
    } finally { setUnitsLoading(false); }
  };

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/finished-goods", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.code.trim(), name: form.name.trim(), productType: form.productType.trim(), unit: form.unit.trim() || "unit", notes: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear Producto base");
      toast.success("Producto base creado");
      setShowCreate(false); setForm({ code: "", name: "", productType: "", unit: "unit" });
      await loadData({ silent: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error al crear producto"); }
    finally { setSaving(false); }
  };

  const publishProduct = async (item: FinishedGood) => {
    const existing = getStoreProduct(storeProducts, item);
    const currentPrice = existing?.price ? String(existing.price) : "";
    const value = window.prompt("Precio de venta", currentPrice);
    if (value === null) return;
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) return toast.error("Precio inválido");
    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", price }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo publicar");
      toast.success("Publicado en Tienda");
      await loadData({ silent: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error al publicar"); }
    finally { setPublishingId(null); }
  };

  const unpublishProduct = async (item: FinishedGood) => {
    setPublishingId(item.id);
    try {
      const res = await fetch(`/api/admin/operations/finished-goods/${item.id}/publish-to-store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo ocultar");
      toast.success("Oculto de Tienda");
      await loadData({ silent: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error al ocultar"); }
    finally { setPublishingId(null); }
  };

  const canDiscard = (unit: InventoryUnit) => !unit.reservedOrderId && !unit.dispatchId && unit.activationStatus !== "activated" && !["reserved", "dispatched", "delivered", "activated"].includes(unit.inventoryStatus);

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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error al descartar"); }
    finally { setDiscardingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-emerald-600" /><h3 className="text-lg font-black text-slate-950">Productos base</h3></div>
        <div className="flex gap-2"><button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white"><Plus className="h-4 w-4" /> Crear producto</button><button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button></div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : (
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50"><tr><th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Producto</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Disponible</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Reservado</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">QC</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tienda</th><th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{products.map((item) => { const row = stockByCode.get(item.code); const storeProduct = getStoreProduct(storeProducts, item); const published = Boolean(storeProduct?.isActive && (storeProduct.operationalMappingMeta?.isPublished ?? true)); return <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-4 py-4"><p className="font-black text-slate-900">{item.name}</p><p className="mt-1 font-mono text-[10px] font-bold text-primary">{item.code}</p></td><td className="px-4 py-4 text-lg font-black text-emerald-700">{row?.availableCount || 0}</td><td className="px-4 py-4 text-lg font-black text-blue-700">{row?.reservedCount || 0}</td><td className="px-4 py-4 text-sm font-black text-slate-700">{row?.qaPendingCount || 0}{row?.qaFailedCount ? <span className="ml-2 text-red-600">· {row.qaFailedCount} rechaz.</span> : null}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${published ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>{published ? "Publicado" : "Oculto"}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => loadUnits(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700"><Eye className="h-3.5 w-3.5" /> Unidades</button>{published ? <button type="button" onClick={() => unpublishProduct(item)} disabled={publishingId === item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-600 disabled:opacity-50">Ocultar</button> : <button type="button" onClick={() => publishProduct(item)} disabled={publishingId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"><Store className="h-3.5 w-3.5" /> Publicar</button>}</div></td></tr>; })}</tbody>
          </table>
        )}
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><form onSubmit={createProduct} className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black text-slate-950">Crear Producto base</h3><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 p-2 text-slate-400"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Código</span><input required value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" placeholder="PRP-FG-..." /></label><label><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span><input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label><label className="sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span><input required value={form.productType} onChange={(e) => setForm((v) => ({ ...v, productType: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" placeholder="sticker_prerescatepty" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear</button></div></form></div>}

      {unitsProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="text-lg font-black text-slate-950">{unitsProduct.name}</h3><p className="font-mono text-[10px] font-bold text-primary">{unitsProduct.code}</p></div><button type="button" onClick={() => { setUnitsProduct(null); setUnits([]); }} className="rounded-xl border border-slate-200 p-2 text-slate-400"><X className="h-4 w-4" /></button></div><div className="max-h-[70vh] overflow-y-auto p-5">{unitsLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : units.length === 0 ? <p className="py-10 text-center text-sm font-bold text-slate-400">Sin unidades</p> : <div className="space-y-2">{units.map((unit) => <div key={unit.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-sm font-black text-slate-900">{unit.internalLabel}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{unit.inventoryStatus} · QC {unit.qaStatus || "—"}{unit.reservedOrderId ? " · reservada" : ""}</p></div>{canDiscard(unit) && <button type="button" onClick={() => discardUnit(unit)} disabled={discardingId === unit.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> {discardingId === unit.id ? "Descartando" : "Descartar"}</button>}</div>)}</div>}</div></div></div>}
    </div>
  );
}
